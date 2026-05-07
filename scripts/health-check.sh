#!/bin/bash

# BucketBackup Enterprise Health Check Suite
# Verifies connectivity and availability across multi-cloud storage endpoints

echo "🚀 Starting BucketBackup System Health Check..."

# 1. Check AWS Connectivity
echo "[AWS] Verifying S3 connectivity..."
if aws s3 ls > /dev/null 2>&1; then
    echo "✅ AWS S3: Connected"
else
    echo "❌ AWS S3: Connection Failed"
fi

# 2. Check GCP Connectivity
echo "[GCP] Verifying Storage connectivity..."
if gsutil ls > /dev/null 2>&1; then
    echo "✅ GCP Storage: Connected"
else
    echo "❌ GCP Storage: Connection Failed"
fi

# 3. Check Azure Connectivity
echo "[Azure] Verifying Blob Storage connectivity..."
if az storage container list --output none > /dev/null 2>&1; then
    echo "✅ Azure Blob: Connected"
else
    echo "❌ Azure Blob: Connection Failed"
fi

# 4. Check Backend API
echo "[Backend] Verifying API health..."
if curl -s http://localhost:4000/health | grep "ok" > /dev/null; then
    echo "✅ Backend API: Healthy"
else
    echo "❌ Backend API: Unreachable"
fi

echo "📊 Health check completed!"
