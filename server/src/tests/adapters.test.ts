import { Readable } from 'stream';
import { AWSS3Adapter, GCPStorageAdapter, AzureBlobAdapter } from '../services/provider-adapters';

// -------------------------------------------------------------
// Core Mock Object Structures
// -------------------------------------------------------------

const mockS3Instance = {
  listObjectsV2: jest.fn().mockReturnValue({
    promise: jest.fn().mockResolvedValue({
      Contents: [{ Key: 'aws-test-file.txt', Size: 500, ETag: '"etag123"', LastModified: new Date() }]
    })
  }),
  getObject: jest.fn().mockReturnValue({
    createReadStream: jest.fn().mockReturnValue(Readable.from(['aws-stream-mock-content']))
  }),
  upload: jest.fn().mockReturnValue({
    promise: jest.fn().mockResolvedValue({ Location: 'https://s3-url.com/aws-test-file.txt' })
  }),
  deleteObject: jest.fn().mockReturnValue({
    promise: jest.fn().mockResolvedValue({})
  }),
  headBucket: jest.fn().mockReturnValue({
    promise: jest.fn().mockResolvedValue({})
  })
};

const mockGCSInstance = {
  bucket: jest.fn().mockReturnValue({
    getFiles: jest.fn().mockResolvedValue([[
      {
        name: 'gcp-test-file.txt',
        metadata: { size: '600', updated: new Date().toISOString(), md5Hash: 'md5hash123' }
      }
    ]]),
    file: jest.fn().mockReturnValue({
      createReadStream: jest.fn().mockReturnValue(Readable.from(['gcp-stream-mock'])),
      createWriteStream: jest.fn().mockImplementation(() => {
        const stream = new Readable();
        stream._read = () => {};
        setTimeout(() => {
          stream.emit('finish');
        }, 10);
        return stream;
      }),
      delete: jest.fn().mockResolvedValue([{}])
    }),
    exists: jest.fn().mockResolvedValue([true])
  })
};

const mockAzureContainerClient = {
  listBlobsFlat: jest.fn().mockImplementation(async function* () {
    yield {
      name: 'azure-test-file.txt',
      properties: { contentLength: 700, lastModified: new Date(), contentMD5: Buffer.from('azuremd5') }
    };
  }),
  getBlobClient: jest.fn().mockReturnValue({
    download: jest.fn().mockResolvedValue({
      readableStreamBody: Readable.from(['azure-stream-mock'])
    })
  }),
  getBlockBlobClient: jest.fn().mockReturnValue({
    uploadStream: jest.fn().mockResolvedValue({}),
    delete: jest.fn().mockResolvedValue({}),
    url: 'https://azure-url.com/azure-test-file.txt'
  }),
  exists: jest.fn().mockResolvedValue(true)
};

const mockAzureServiceClient = {
  getContainerClient: jest.fn().mockReturnValue(mockAzureContainerClient)
};

// -------------------------------------------------------------
// Test suites
// -------------------------------------------------------------
describe('Cloud Storage Adapters Unit Tests', () => {
  
  describe('AWS S3 Adapter', () => {
    let adapter: AWSS3Adapter;

    beforeAll(() => {
      // Initialize with dummy keys, then inject mock client
      adapter = new AWSS3Adapter({ accessKeyId: 'dummy', secretAccessKey: 'dummy' });
      adapter['s3'] = mockS3Instance as any;
    });

    test('should list objects successfully', async () => {
      const items = await adapter.listObjects('test-bucket');
      expect(items.length).toBe(1);
      expect(items[0]!.key).toBe('aws-test-file.txt');
      expect(items[0]!.size).toBe(500);
      expect(items[0]!.checksum).toBe('etag123');
    });

    test('should download object as stream', async () => {
      const stream = await adapter.downloadObject('test-bucket', 'aws-test-file.txt');
      expect(stream).toBeDefined();
    });

    test('should test connection successfully', async () => {
      const isOk = await adapter.testConnection('test-bucket');
      expect(isOk).toBe(true);
    });
  });

  describe('GCP Storage Adapter', () => {
    let adapter: GCPStorageAdapter;

    beforeAll(() => {
      // Initialize with empty JSON credentials, then inject mock client
      adapter = new GCPStorageAdapter({ gcpKeyFile: '{}' });
      adapter['storage'] = mockGCSInstance as any;
    });

    test('should list objects successfully', async () => {
      const items = await adapter.listObjects('gcp-bucket');
      expect(items.length).toBe(1);
      expect(items[0]!.key).toBe('gcp-test-file.txt');
      expect(items[0]!.size).toBe(600);
      expect(items[0]!.checksum).toBe('md5hash123');
    });

    test('should test connection successfully', async () => {
      const isOk = await adapter.testConnection('gcp-bucket');
      expect(isOk).toBe(true);
    });
  });

  describe('Azure Blob Storage Adapter', () => {
    let adapter: AzureBlobAdapter;

    beforeAll(() => {
      // Initialize with dummy connection string, then inject mock client
      adapter = new AzureBlobAdapter({ connectionString: 'DefaultEndpointsProtocol=https;AccountName=test;AccountKey=test;EndpointSuffix=core.windows.net' });
      adapter['blobServiceClient'] = mockAzureServiceClient as any;
    });

    test('should list objects successfully', async () => {
      const items = await adapter.listObjects('azure-container');
      expect(items.length).toBe(1);
      expect(items[0]!.key).toBe('azure-test-file.txt');
      expect(items[0]!.size).toBe(700);
    });

    test('should test connection successfully', async () => {
      const isOk = await adapter.testConnection('azure-container');
      expect(isOk).toBe(true);
    });
  });
});
