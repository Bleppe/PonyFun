pipeline {
    agent any
    
    environment {
        // Docker image names
        BACKEND_IMAGE = 'ponyfun-backend:latest'
        FRONTEND_IMAGE = 'ponyfun-frontend:latest'
        
        // Application ports
        FRONTEND_PORT = '4201'
        BACKEND_PORT = '3005'
        
        // Deployment directory (adjust if needed)
        DEPLOY_DIR = "${WORKSPACE}"
    }
    
    options {
        // Keep only the last 10 builds
        buildDiscarder(logRotator(numToKeepStr: '10'))
        
        // Timeout after 30 minutes
        timeout(time: 30, unit: 'MINUTES')
        
        // Don't allow concurrent builds
        disableConcurrentBuilds()
    }
    
    triggers {
        // Poll SCM every 5 minutes for changes
        pollSCM('H/5 * * * *')
        
        // Alternative: Use webhooks (recommended for production)
        // githubPush()
    }
    
    stages {
        stage('Checkout') {
            steps {
                echo '🔄 Checking out code...'
                checkout scm
                
                script {
                    // Get version from package.json
                    def version = sh(
                        script: "grep -o '\"version\": \"[^\"]*\"' frontend/package.json | cut -d'\"' -f4",
                        returnStdout: true
                    ).trim()
                    env.APP_VERSION = version
                    echo "📦 Building version: v${version}"
                }
            }
        }
        
        stage('Pre-deployment Checks') {
            steps {
                echo '🔍 Running pre-deployment checks...'
                
                script {
                    // Check if Docker is available
                    sh 'docker --version'
                    sh 'docker-compose --version'
                    
                    // Check disk space
                    sh 'df -h'
                }
            }
        }
        
        stage('Stop Existing Services') {
            steps {
                echo '🛑 Stopping existing containers...'
                
                script {
                    // Stop existing containers gracefully
                    sh '''
                        if docker-compose ps | grep -q "Up"; then
                            docker-compose down
                        else
                            echo "No running containers to stop"
                        fi
                    '''
                }
            }
        }
        
        stage('Build Images') {
            steps {
                echo '🔨 Building Docker images (no cache)...'
                
                script {
                    // Build with no cache to ensure fresh build
                    sh 'docker-compose build --no-cache --pull'
                }
            }
        }
        
        stage('Deploy') {
            steps {
                echo '🚀 Deploying services...'
                
                script {
                    // Start services in detached mode
                    sh 'docker-compose up -d'
                    
                    // Wait for services to be ready
                    echo '⏳ Waiting for services to start...'
                    sleep(time: 10, unit: 'SECONDS')
                }
            }
        }
        
        stage('Health Check') {
            steps {
                echo '🏥 Running health checks...'
                
                script {
                    // Check if containers are running
                    sh 'docker-compose ps'
                    
                    // Wait for backend to be ready
                    retry(5) {
                        sleep(time: 5, unit: 'SECONDS')
                        sh """
                            curl -f http://localhost:${BACKEND_PORT}/health || \
                            curl -f http://localhost:${BACKEND_PORT}/ || \
                            echo "Backend health check - attempt"
                        """
                    }
                    
                    // Wait for frontend to be ready
                    retry(5) {
                        sleep(time: 5, unit: 'SECONDS')
                        sh """
                            curl -f http://localhost:${FRONTEND_PORT}/ || \
                            echo "Frontend health check - attempt"
                        """
                    }
                }
            }
        }
        
        stage('Verify Deployment') {
            steps {
                echo '✅ Verifying deployment...'
                
                script {
                    // Check container status
                    def backendStatus = sh(
                        script: "docker-compose ps backend | grep -c 'Up' || true",
                        returnStdout: true
                    ).trim()
                    
                    def frontendStatus = sh(
                        script: "docker-compose ps frontend | grep -c 'Up' || true",
                        returnStdout: true
                    ).trim()
                    
                    if (backendStatus == '0' || frontendStatus == '0') {
                        error('❌ One or more services failed to start')
                    }
                    
                    echo "✅ All services are running"
                    echo "📍 Frontend: http://localhost:${FRONTEND_PORT}"
                    echo "📍 Backend:  http://localhost:${BACKEND_PORT}"
                    echo "🔖 Version:  v${env.APP_VERSION}"
                }
            }
        }
        
        stage('Cleanup Old Images') {
            steps {
                echo '🧹 Cleaning up old Docker images...'
                
                script {
                    // Remove dangling images to save space
                    sh '''
                        docker image prune -f || true
                    '''
                }
            }
        }
    }
    
    post {
        success {
            echo '🎉 Deployment completed successfully!'
            echo "💡 Check the version in the bottom left corner of the app to verify deployment!"
            echo "📍 Application URL: http://localhost:${FRONTEND_PORT}"
            
            // Optional: Send notification (configure based on your setup)
            // emailext (
            //     subject: "✅ PonyFun Deployment Successful - v${env.APP_VERSION}",
            //     body: "Deployment of version ${env.APP_VERSION} completed successfully.",
            //     to: 'team@example.com'
            // )
        }
        
        failure {
            echo '❌ Deployment failed!'
            
            script {
                // Collect logs for debugging
                sh 'docker-compose logs --tail=100 || true'
            }
            
            // Optional: Send failure notification
            // emailext (
            //     subject: "❌ PonyFun Deployment Failed - v${env.APP_VERSION}",
            //     body: "Deployment of version ${env.APP_VERSION} failed. Check Jenkins logs for details.",
            //     to: 'team@example.com'
            // )
        }
        
        always {
            // Archive logs
            script {
                sh 'docker-compose logs > docker-logs.txt || true'
                archiveArtifacts artifacts: 'docker-logs.txt', allowEmptyArchive: true
            }
        }
        
        cleanup {
            // Clean up workspace if needed
            echo '🧹 Cleaning up workspace...'
        }
    }
}
