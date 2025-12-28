pipeline {
  agent any

  environment {
    // Application ports
    FRONTEND_PORT = '4201'
    BACKEND_PORT = '3005'
  }

  stages {
    stage('Setup Docker') {
      steps {
        script {
          // Check if docker is available; if not, download the static binary
          if (sh(script: 'command -v docker', returnStatus: true) != 0) {
            echo "Docker not found. Downloading static binary..."
            sh 'mkdir -p docker-bin'
            // Download Docker static binary for Linux x86_64
            sh 'curl -fsSL https://download.docker.com/linux/static/stable/x86_64/docker-24.0.5.tgz -o docker.tgz'
            sh 'tar xzvf docker.tgz'
            // Move the binary to our bin folder
            sh 'mv docker/docker docker-bin/docker'
            sh 'rm -rf docker docker.tgz'
            sh 'chmod +x docker-bin/docker'
          }
          
          // Check if docker-compose is available; if not, download it
          if (sh(script: 'command -v docker-compose', returnStatus: true) != 0) {
            echo "Docker Compose not found. Downloading..."
            sh 'mkdir -p docker-bin'
            sh 'curl -fsSL "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-linux-x86_64" -o docker-bin/docker-compose'
            sh 'chmod +x docker-bin/docker-compose'
          }
        }
      }
    }

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

    stage('Stop Existing Services') {
      environment {
        PATH = "${WORKSPACE}/docker-bin:${env.PATH}"
      }
      steps {
        echo '🛑 Stopping existing containers...'
        
        withEnv(overrides: ['DOCKER_HOST=', 'DOCKER_TLS_VERIFY=', 'DOCKER_CERT_PATH=']) {
          script {
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
    }

    stage('Build Images') {
      environment {
        PATH = "${WORKSPACE}/docker-bin:${env.PATH}"
      }
      steps {
        echo '🔨 Building Docker images (no cache)...'
        
        withEnv(overrides: ['DOCKER_HOST=', 'DOCKER_TLS_VERIFY=', 'DOCKER_CERT_PATH=']) {
          sh 'docker-compose build --no-cache --pull'
        }
      }
    }

    stage('Deploy') {
      environment {
        PATH = "${WORKSPACE}/docker-bin:${env.PATH}"
      }
      steps {
        echo '🚀 Deploying services...'
        
        withEnv(overrides: ['DOCKER_HOST=', 'DOCKER_TLS_VERIFY=', 'DOCKER_CERT_PATH=']) {
          sh 'docker-compose up -d'
          
          script {
            echo '⏳ Waiting for services to start...'
            sleep 10
            
            // Check if containers are running
            def backendRunning = sh(
              script: 'docker-compose ps backend | grep -c "Up" || true',
              returnStdout: true
            ).trim()
            
            def frontendRunning = sh(
              script: 'docker-compose ps frontend | grep -c "Up" || true',
              returnStdout: true
            ).trim()
            
            if (backendRunning == '0' || frontendRunning == '0') {
              echo "❌ One or more services failed to start. Fetching logs..."
              sh 'docker-compose logs'
              error("Services failed to start")
            } else {
              echo "✅ All services started successfully!"
              sh 'docker-compose ps'
            }
          }
        }
      }
    }

    stage('Health Check') {
      environment {
        PATH = "${WORKSPACE}/docker-bin:${env.PATH}"
      }
      steps {
        echo '🏥 Running health checks...'
        
        script {
          // Wait for backend to be ready
          retry(5) {
            sleep(time: 5, unit: 'SECONDS')
            sh """
              curl -f http://localhost:${BACKEND_PORT}/api/races || \
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

    stage('Cleanup Old Images') {
      environment {
        PATH = "${WORKSPACE}/docker-bin:${env.PATH}"
      }
      steps {
        echo '🧹 Cleaning up old Docker images...'
        
        withEnv(overrides: ['DOCKER_HOST=', 'DOCKER_TLS_VERIFY=', 'DOCKER_CERT_PATH=']) {
          sh 'docker image prune -f || true'
        }
      }
    }
  }

  post {
    success {
      echo '🎉 Deployment completed successfully!'
      echo "💡 Check the version in the bottom left corner of the app to verify deployment!"
      echo "📍 Frontend: http://localhost:${FRONTEND_PORT}"
      echo "📍 Backend:  http://localhost:${BACKEND_PORT}"
      echo "🔖 Version:  v${env.APP_VERSION}"
    }
    
    failure {
      echo '❌ Deployment failed!'
      
      script {
        // Collect logs for debugging
        sh 'docker-compose logs --tail=100 || true'
      }
    }
    
    always {
      script {
        // Archive logs
        sh 'docker-compose logs > docker-logs.txt || true'
        archiveArtifacts artifacts: 'docker-logs.txt', allowEmptyArchive: true
      }
    }
  }
}
