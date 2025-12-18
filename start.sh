#!/bin/bash

# Bot Hosting Platform Startup Script
# This script helps set up and start the platform locally

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Node.js is installed
check_node() {
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18 or higher."
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2)
    REQUIRED_VERSION="18.0.0"
    
    if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
        print_error "Node.js version $NODE_VERSION is not supported. Please install Node.js 18 or higher."
        exit 1
    fi
    
    print_success "Node.js $NODE_VERSION detected"
}

# Check if npm is installed
check_npm() {
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed."
        exit 1
    fi
    
    print_success "npm $(npm -v) detected"
}

# Install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    
    if [ ! -d "node_modules" ]; then
        npm install
        print_success "Dependencies installed"
    else
        print_status "Dependencies already installed, checking for updates..."
        npm update
        print_success "Dependencies updated"
    fi
}

# Set up environment variables
setup_env() {
    if [ ! -f ".env" ]; then
        print_status "Creating .env file from template..."
        cp .env.example .env
        print_warning "Please edit .env file with your configuration before running the application"
        
        # Generate a random JWT secret
        JWT_SECRET=$(openssl rand -base64 32 2>/dev/null || date | sha256sum | base64 | head -c 32)
        sed -i "s/your-super-secret-jwt-key-change-this-in-production/$JWT_SECRET/" .env
        print_success "Generated random JWT secret"
    else
        print_status ".env file already exists"
    fi
}

# Create necessary directories
create_directories() {
    print_status "Creating necessary directories..."
    
    mkdir -p uploads/bots
    mkdir -p uploads/websites
    mkdir -p backups
    mkdir -p logs
    
    print_success "Directories created"
}

# Set file permissions
set_permissions() {
    print_status "Setting file permissions..."
    
    chmod +x start.sh
    chmod 755 uploads
    chmod 755 backups
    chmod 755 logs
    
    print_success "Permissions set"
}

# Start the application
start_application() {
    print_status "Starting Bot Hosting Platform..."
    
    # Load environment variables
    if [ -f ".env" ]; then
        export $(cat .env | grep -v '^#' | xargs)
    fi
    
    # Check if we're in development mode
    if [ "$NODE_ENV" = "development" ] || [ -z "$NODE_ENV" ]; then
        print_status "Starting in development mode with nodemon..."
        npm run dev
    else
        print_status "Starting in production mode..."
        npm start
    fi
}

# Show help
show_help() {
    echo "Bot Hosting Platform Startup Script"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  start     Start the application (default)"
    echo "  setup     Set up the environment only"
    echo "  dev       Start in development mode"
    echo "  prod      Start in production mode"
    echo "  docker    Start with Docker Compose"
    echo "  help      Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                # Start application"
    echo "  $0 setup          # Setup environment only"
    echo "  $0 dev            # Start in development mode"
    echo "  $0 docker         # Start with Docker Compose"
}

# Main execution
main() {
    echo "=========================================="
    echo "  Bot Hosting Platform Startup Script"
    echo "=========================================="
    echo ""
    
    case "${1:-start}" in
        "setup")
            check_node
            check_npm
            install_dependencies
            setup_env
            create_directories
            set_permissions
            print_success "Setup completed successfully!"
            print_warning "Please edit .env file with your configuration"
            ;;
        "dev")
            export NODE_ENV=development
            check_node
            check_npm
            install_dependencies
            setup_env
            create_directories
            set_permissions
            start_application
            ;;
        "prod")
            export NODE_ENV=production
            check_node
            check_npm
            install_dependencies
            setup_env
            create_directories
            set_permissions
            start_application
            ;;
        "docker")
            print_status "Starting with Docker Compose..."
            if command -v docker-compose &> /dev/null; then
                docker-compose up -d
            elif command -v docker &> /dev/null; then
                docker compose up -d
            else
                print_error "Docker Compose is not installed"
                exit 1
            fi
            print_success "Docker containers started"
            print_status "Application will be available at http://localhost:3000"
            ;;
        "help"|"-h"|"--help")
            show_help
            ;;
        "start"|"")
            check_node
            check_npm
            install_dependencies
            setup_env
            create_directories
            set_permissions
            start_application
            ;;
        *)
            print_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"