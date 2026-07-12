<div align="center">

# ☁️ BucketBackup
### **Enterprise-Grade Multi-Cloud Backup & Disaster Recovery**

[![Next.js](https://img.shields.io/badge/Frontend-Next.js%2014-black?style=for-the-badge&logo=next.js)](https://nextjs.org/) [![Node.js](https://img.shields.io/badge/Backend-Node.js-339933?style=for-the-badge&logo=node.js)](https://nodejs.org/) [![Terraform](https://img.shields.io/badge/IaC-Terraform-623CE4?style=for-the-badge&logo=terraform)](https://www.terraform.io/) [![Kubernetes](https://img.shields.io/badge/Deployment-Kubernetes-326CE5?style=for-the-badge&logo=kubernetes)](https://kubernetes.io/) [![License](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

<img src="./bucketbackup.png" alt="BucketBackup Banner" width="100%">

**BucketBackup** is a high-performance, intelligent orchestration platform designed to secure and synchronize your data across the world's leading cloud storage providers. Built for reliability, it ensures your enterprise data is always protected, versioned, and recoverable.

</div>

---

## 🌟 Key Capabilities

BucketBackup isn't just a sync tool; it's a complete data management ecosystem.

- 🛡️ **Multi-Cloud Synergy**: Seamlessly bridge **AWS S3**, **Google Cloud Storage**, and **Azure Blob Storage**.
- ⚡ **Real-Time Sync**: High-concurrency engine for instantaneous data replication.
- 🤖 **AI-Powered Monitoring**: Integrated anomaly detection to identify potential data corruption or security threats.
- 🔄 **One-Click Recovery**: Intuitive disaster recovery workflows to restore business continuity in minutes.
- 🔐 **Zero-Trust Security**: End-to-end AES-256 encryption with granular Role-Based Access Control (RBAC).
- 📊 **Live Analytics**: A stunning executive dashboard providing real-time visibility into your global storage footprint.

---

## 🏗️ System Architecture

BucketBackup uses a decoupled, microservices-ready architecture designed for horizontal scalability.

```mermaid
graph TD
    User((User)) -->|HTTPS| Dashboard[Next.js Dashboard]
    Dashboard -->|API| API[Node.js / Express API]
    API -->|Jobs| Scheduler[Cron / Event Scheduler]
    Scheduler -->|Task| SyncEngine[Sync & Recovery Engine]
    
    subgraph "Storage Layer"
        SyncEngine -->|S3 Protocol| AWS[AWS S3]
        SyncEngine -->|GCS API| GCP[Google Cloud Storage]
        SyncEngine -->|Blob API| Azure[Azure Blob Storage]
    end
    
    API -->|Query/Command| DB[(PostgreSQL / Prisma)]
    SyncEngine -->|Logs/Status| API
```

---

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | Next.js 14, Tailwind CSS, Lucide Icons | Modern, responsive dashboard UI |
| **Backend** | Node.js, TypeScript, Express | High-performance API and business logic |
| **Database** | PostgreSQL, Prisma ORM | Relational data and schema management |
| **Infrastructure** | Terraform, HCL | Multi-cloud resource provisioning |
| **Orchestration** | Kubernetes, Docker, Helm | Containerized deployment and scaling |
| **Cloud** | AWS, GCP, Azure | Distributed object storage providers |

---

## 🚀 Getting Started & Configuration

### 📋 Prerequisites
* **Node.js (v20+)** and **npm**
* **Docker & Kubernetes** (with Ingress NGINX enabled for cluster deployments)
* **Terraform (v1.5+)** (for multi-cloud bucket provisioning)
* **PostgreSQL** database instance (or run via Kubernetes manifests)

---

### ⚙️ Environment Variables Configuration

#### Backend Environment Variables (`server/.env`)
Create a `.env` file in the `server` folder with the following variables:
```env
PORT=4000
DATABASE_URL="postgresql://backupuser:supersecurepassword@localhost:5432/bucketbackup?schema=public"
JWT_SECRET="generate-a-secure-jwt-random-token-secret-key"
BACKEND_ENCRYPTION_KEY="your-aes-256-bit-key-for-credentials-at-rest"
SLACK_WEBHOOK_URL="https://hooks.slack.com/services/..."
```

#### Frontend Environment Variables (`client/.env.local`)
Create a `.env.local` file in the `client` folder:
```env
NEXT_PUBLIC_API_URL="http://localhost:4000/api"
```

---

### 🔐 Provider Onboarding Credentials Setup

To sync data across AWS, GCP, and Azure, you must provision access keys with the following least-privilege permissions:

#### 1. AWS S3 Credentials
* **Policy Action**: `s3:ListBucket`, `s3:GetObject`, `s3:PutObject`, `s3:DeleteObject`
* **Onboarding Fields**: Bucket Name, Region, Access Key ID, Secret Access Key.

#### 2. Google Cloud Storage (GCP GCS)
* **IAM Role**: `Storage Object Admin`
* **Setup**: Create a Service Account, generate a JSON key, and copy the entire JSON content into the onboarding key field.

#### 3. Azure Blob Storage
* **Onboarding Fields**: Container Name, Storage Account Connection String.
* **Format**: `DefaultEndpointsProtocol=https;AccountName=<name>;AccountKey=<key>;EndpointSuffix=core.windows.net`

---

### 💻 Local Development Workflow

#### 1. Initialize Relational Database Schema
Apply the Prisma schemas and generate local Prisma Clients:
```bash
cd server
npm install
npx prisma generate
```

#### 2. Launch Backend API Server
```bash
npm run dev
```

#### 3. Launch Frontend Client Dashboard
```bash
cd ../client
npm install
npm run dev
```
Visit **`http://localhost:3000`** to open the dashboard interface.

---

### 🧪 Executing Automated Tests

Run the complete Jest test suite (unit tests and integration tests) using the package runner:
```bash
cd server
npm run test
```

---

### 🏗️ Infrastructure Provisioning (Terraform)

Provision the necessary S3, GCS, and Azure Blob storage structures on your active accounts:
```bash
cd terraform
terraform init
terraform plan
terraform apply -auto-approve
```

---

### 🐳 Kubernetes Cluster Deployment

To deploy the production-ready stack (PostgreSQL state, api server, client server, HPA scaling policies, Ingress rules) to your cluster:

1. **Build Container Images**:
   ```bash
   docker build -t bucketbackup-server:latest ./server
   docker build -t bucketbackup-client:latest ./client
   ```
2. **Apply Kubernetes Manifests**:
   ```bash
   kubectl apply -f k8s/
   ```
3. **Verify Deployment Services**:
   ```bash
   kubectl get pods -w
   kubectl get ingress
   ```

---

## 📖 API Endpoint Documentation Reference

All endpoints (except Authentication and Health check) require a `Bearer <token>` authentication header.

### 👤 Authentication API
* `POST /api/auth/register` - Create user account and organization workspace.
* `POST /api/auth/login` - Sign in operator. Returns JWT bearer token.
* `GET /api/auth/me` - Fetch details on active operator profile.

### 🗄️ Storage Onboarding API
* `POST /api/storage` - Register a new cloud storage target (AWS/GCP/Azure).
* `GET /api/storage` - List safe-masked configurations for organization.
* `POST /api/storage/:id/verify` - Trigger connection check to verify cloud keys.
* `GET /api/storage/:id/inventory` - Fetch list of files and folders inside bucket.

### 🔄 Sync Jobs Orchestration API
* `POST /api/backups` - Create a sync job schedule (cron, one-way/bidirectional, source, destination).
* `GET /api/backups` - List backup job schedules.
* `PUT /api/backups/:id` - Edit parameters of a job rule.
* `DELETE /api/backups/:id` - Delete job rule and unschedule cron tasks.
* `POST /api/backups/:id/trigger` - Force immediate manual backup run.
* `POST /api/backups/:id/pause` - Disable scheduler for a job.
* `POST /api/backups/:id/resume` - Re-enable cron scheduling.
* `GET /api/backups/:id/logs` - Retrieve execution logs for job.

### 🛡️ Disaster Recovery Restore API
* `POST /api/history/restores` - Initiate point-in-time file recovery.
* `GET /api/history/restores` - List DR restore runs.
* `GET /api/history/restores/:id` - Check progress of a restore job.

### 📊 Monitoring & Alerts API
* `GET /api/monitoring/audits` - Fetch administrative action audit logs.
* `GET /api/monitoring/alerts` - List active data anomalies or duration spikes.
* `POST /api/monitoring/alerts/:id/resolve` - Dismiss warning alerts.

### 📈 System Metrics API
* `GET /api/system/health` - Liveness probe endpoint.
* `GET /api/system/metrics` - Fetch real-time host CPU, memory, and database counters.

---

## 📜 License
Distributed under the MIT License. See `LICENSE` for more information.

---

<div align="center">
Built with ❤️ by <strong>Pranav Saraswat</strong>  
*Empowering enterprises with intelligent cloud recovery.*
</div>
