#!/bin/bash

# Environment Variables Migration Script
# This script helps migrate from old multi-file .env setup to unified .env file

set -e

echo "🔄 Advatens Environment Migration"
echo "=================================="
echo ""

# Check if .env already exists
if [ -f ".env" ]; then
    echo "⚠️  .env file already exists!"
    read -p "Do you want to overwrite it? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Migration cancelled"
        exit 1
    fi
    echo "📝 Backing up existing .env to .env.backup"
    cp .env .env.backup
fi

# Copy from example
echo "📋 Creating .env from .env.example..."
cp .env.example .env

# Function to extract value from old env file
extract_value() {
    local file=$1
    local key=$2
    if [ -f "$file" ]; then
        grep "^${key}=" "$file" | cut -d '=' -f 2- | sed 's/^"//' | sed 's/"$//'
    fi
}

# Function to update .env file
update_env() {
    local key=$1
    local value=$2
    if [ -n "$value" ]; then
        # Escape special characters for sed
        local escaped_value=$(echo "$value" | sed 's/[\/&]/\\&/g')
        # Update in .env file
        if grep -q "^${key}=" .env; then
            sed -i.tmp "s|^${key}=.*|${key}=${escaped_value}|" .env
            rm .env.tmp 2>/dev/null || true
        fi
        echo "  ✓ ${key}"
    fi
}

# Migrate from server/app.env
if [ -f "server/app.env" ]; then
    echo ""
    echo "📦 Migrating from server/app.env..."

    update_env "DB_HOST" "$(extract_value 'server/app.env' 'DB_HOST')"
    update_env "DB_PORT" "$(extract_value 'server/app.env' 'DB_PORT')"
    update_env "DB_DATABASE" "$(extract_value 'server/app.env' 'DB_DATABASE')"
    update_env "DB_USERNAME" "$(extract_value 'server/app.env' 'DB_USERNAME')"
    update_env "DB_PASSWORD" "$(extract_value 'server/app.env' 'DB_PASSWORD')"
    update_env "DB_SCHEMA" "$(extract_value 'server/app.env' 'DB_SCHEMA')"

    update_env "INFLUXDB_URL" "$(extract_value 'server/app.env' 'INFLUXDB_URL')"
    update_env "INFLUXDB_TOKEN" "$(extract_value 'server/app.env' 'INFLUXDB_TOKEN')"
    update_env "INFLUXDB_ORG" "$(extract_value 'server/app.env' 'INFLUXDB_ORG')"
    update_env "INFLUXDB_BUCKET" "$(extract_value 'server/app.env' 'INFLUXDB_BUCKET')"

    update_env "CLERK_SECRET_KEY" "$(extract_value 'server/app.env' 'CLERK_SECRET_KEY')"

    update_env "CHIRPSTACK_API_URL" "$(extract_value 'server/app.env' 'CHIRPSTACK_API_URL')"
    update_env "CHIRPSTACK_API_TOKEN" "$(extract_value 'server/app.env' 'CHIRPSTACK_API_TOKEN')"
    update_env "CHIRPSTACK_APPLICATION_ID" "$(extract_value 'server/app.env' 'CHIRPSTACK_APPLICATION_ID')"
    update_env "CHIRPSTACK_DEVICE_PROFILE_ID" "$(extract_value 'server/app.env' 'CHIRPSTACK_DEVICE_PROFILE_ID')"
fi

# Migrate from frontend/.env
if [ -f "frontend/.env" ]; then
    echo ""
    echo "🎨 Migrating from frontend/.env..."

    update_env "VITE_API_BASE_URL" "$(extract_value 'frontend/.env' 'VITE_API_BASE_URL')"
    update_env "VITE_CLERK_PUBLISHABLE_KEY" "$(extract_value 'frontend/.env' 'VITE_CLERK_PUBLISHABLE_KEY')"
fi

echo ""
echo "✅ Migration complete!"
echo ""
echo "📝 Your new .env file is ready at: .env"
echo ""

# Check for missing required variables
echo "🔍 Checking for missing required variables..."
missing=0

check_required() {
    local key=$1
    local value=$(grep "^${key}=" .env | cut -d '=' -f 2-)
    if [ -z "$value" ]; then
        echo "  ❌ ${key} is not set"
        missing=1
    else
        echo "  ✓ ${key}"
    fi
}

check_required "CLERK_SECRET_KEY"
check_required "VITE_CLERK_PUBLISHABLE_KEY"
check_required "CHIRPSTACK_APPLICATION_ID"
check_required "CHIRPSTACK_DEVICE_PROFILE_ID"

echo ""

if [ $missing -eq 1 ]; then
    echo "⚠️  Some required variables are missing!"
    echo "Please edit .env and fill in the missing values."
    echo ""
    echo "Get Clerk keys from: https://dashboard.clerk.com"
    echo "Get ChirpStack IDs from: http://localhost:8080 (after starting ChirpStack)"
    echo ""
fi

# Ask about deleting old files
if [ -f "server/app.env" ] || [ -f "frontend/.env" ]; then
    echo "🗑️  Old environment files found:"
    [ -f "server/app.env" ] && echo "  - server/app.env"
    [ -f "frontend/.env" ] && echo "  - frontend/.env"
    echo ""
    read -p "Do you want to delete these old files? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        [ -f "server/app.env" ] && mv server/app.env server/app.env.backup && echo "  ✓ server/app.env → server/app.env.backup"
        [ -f "frontend/.env" ] && mv frontend/.env frontend/.env.backup && echo "  ✓ frontend/.env → frontend/.env.backup"
        echo ""
        echo "Old files backed up (you can delete .backup files later)"
    fi
fi

echo ""
echo "🚀 Next steps:"
echo "  1. Review and edit .env if needed"
echo "  2. Run: docker-compose up"
echo "  3. Access your app at http://localhost:3000"
echo ""
