# ☁️ BucketBackup | Enterprise-Grade Cloud Backup & Disaster Recovery

![BucketBackup Banner](./bucketbackup.png)

[![Next.js](https://img.shields.io/badge/Frontend-Next.js%2014-black?style=flat&logo=next.js)](https://nextjs.org/)
[![Node.js](https://img.shields.io/badge/Backend-Node.js-green?style=flat&logo=node.js)](https://nodejs.org/)
[![Terraform](https://img.shields.io/badge/IaC-Terraform-blue?style=flat&logo=terraform)](https://www.terraform.io/)
[![Multi-Cloud](https://img.shields.io/badge/Storage-AWS%20|%20GCP%20|%20Azure-blue?style=flat)](https://aws.amazon.com/)
[![Kubernetes](https://img.shields.io/badge/Deployment-Kubernetes-blue?style=flat&logo=kubernetes)](https://kubernetes.io/)

BucketBackup is a production-ready, intelligent cloud backup and disaster recovery platform. It orchestrates secure, scalable backups across **AWS S3, Google Cloud Storage, and Azure Blob Storage** with real-time monitoring and AI-powered anomaly detection.

---

## 🚀 Features

✅ **Multi-Cloud Mastery**: Native support for AWS, GCP, and Azure storage.  
✅ **Intelligent Scheduling**: Automated cron-based and event-driven backup orchestration.  
✅ **Real-time Dashboard**: Stunning Next.js 14 dashboard with live analytics and job health.  
✅ **AI Anomaly Detection**: Proactive monitoring for data corruption or unusual storage patterns.  
✅ **Disaster Recovery**: One-click restore workflows and cross-region replication.  
✅ **Enterprise Security**: Encryption at rest/transit, RBAC, and secure secret management.  
✅ **Cloud Native**: Fully containerized (Docker) and Kubernetes-ready (Helm/Manifests).  
✅ **IaC Powered**: Infrastructure deployment via Terraform for predictable environments.  

---

## 📂 Project Structure

```text
.
├── client/          # Next.js 14 Frontend Dashboard
├── server/          # Node.js/TypeScript API & Sync Engine
├── terraform/       # Infrastructure as Code (AWS, GCP, Azure)
├── k8s/             # Kubernetes Deployment Manifests
├── scripts/         # Helper & Migration scripts
└── shared/          # Shared types and utilities
```

---

## 🛠 Prerequisites

1. **Node.js v20+** & **npm/yarn**
2. **Docker** & **Kubernetes** (Minikube or Kind for local dev)
3. **Terraform** (for infrastructure provisioning)
4. **Cloud Credentials**: Access keys for AWS, GCP Service Account, and Azure Connection Strings.

---

## 🚀 Getting Started

### 1. Infrastructure Setup
Provision your cloud buckets using Terraform:
```bash
cd terraform
terraform init
terraform apply -auto-approve
```

### 2. Backend Setup
Configure your environment variables in `server/.env`:
```bash
cd server
npm install
npx prisma generate
npm run dev
```

### 3. Frontend Setup
Launch the dashboard:
```bash
cd client
npm install
npm run dev
```
Visit `http://localhost:3000` to access the dashboard.

---

## 🐳 Deployment (Docker & K8s)

Build images:
```bash
docker build -t bucketbackup-server ./server
docker build -t bucketbackup-client ./client
```

Deploy to Kubernetes:
```bash
kubectl apply -f k8s/
```

---

## 🛡 Security & Compliance

- **Encryption**: All data is encrypted using AES-256 before being uploaded to cloud providers.
- **Audit Logs**: Every backup job and access request is logged for compliance tracking.
- **Integrity**: MD5/SHA-256 checksum validation ensures zero data corruption during transit.

---

## 📜 License

Distributed under the **MIT License**. See `LICENSE` for more information.

---

## 📞 Contact

Built with ❤️ by **Pranav Saraswat**  
For support or enterprise inquiries, please open an issue on GitHub.
