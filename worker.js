const cron = require('node-cron');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

// Database setup
const db = new sqlite3.Database(process.env.DATABASE_PATH || './database.sqlite');

// Bot management functions
class BotManager {
    constructor() {
        this.runningBots = new Map();
    }

    // Start a bot
    async startBot(botId, botPath, config) {
        try {
            if (this.runningBots.has(botId)) {
                console.log(`Bot ${botId} is already running`);
                return false;
            }

            // For now, we'll simulate bot execution
            // In a real implementation, you would:
            // 1. Extract the bot files if they're compressed
            // 2. Run the bot in a separate process or container
            // 3. Monitor the bot's health
            // 4. Handle bot logs and errors
            
            const botProcess = {
                id: botId,
                startTime: new Date(),
                status: 'running',
                pid: Math.floor(Math.random() * 10000) // Mock PID
            };

            this.runningBots.set(botId, botProcess);
            
            // Update database
            await this.updateBotStatus(botId, 'running');
            
            console.log(`Bot ${botId} started successfully`);
            return true;
        } catch (error) {
            console.error(`Error starting bot ${botId}:`, error);
            await this.updateBotStatus(botId, 'error');
            return false;
        }
    }

    // Stop a bot
    async stopBot(botId) {
        try {
            const botProcess = this.runningBots.get(botId);
            if (!botProcess) {
                console.log(`Bot ${botId} is not running`);
                return false;
            }

            // In a real implementation, you would:
            // 1. Gracefully shutdown the bot process
            // 2. Clean up resources
            // 3. Handle any pending operations
            
            this.runningBots.delete(botId);
            await this.updateBotStatus(botId, 'stopped');
            
            console.log(`Bot ${botId} stopped successfully`);
            return true;
        } catch (error) {
            console.error(`Error stopping bot ${botId}:`, error);
            return false;
        }
    }

    // Restart a bot
    async restartBot(botId, botPath, config) {
        await this.stopBot(botId);
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
        return await this.startBot(botId, botPath, config);
    }

    // Update bot status in database
    async updateBotStatus(botId, status) {
        return new Promise((resolve, reject) => {
            db.run(
                'UPDATE bots SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [status, botId],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.changes);
                }
            );
        });
    }

    // Get all running bots
    getRunningBots() {
        return Array.from(this.runningBots.values());
    }

    // Health check for running bots
    async healthCheck() {
        const runningBots = this.getRunningBots();
        
        for (const bot of runningBots) {
            try {
                // In a real implementation, you would check:
                // 1. Process is still alive
                // 2. Bot is responding to health checks
                // 3. Resource usage is within limits
                
                const uptime = Date.now() - bot.startTime.getTime();
                console.log(`Bot ${bot.id} health check - Uptime: ${uptime}ms`);
                
                // Simulate occasional bot failures for testing
                if (Math.random() < 0.01) { // 1% chance of failure
                    console.log(`Bot ${bot.id} health check failed, restarting...`);
                    await this.restartBot(bot.id, '', {});
                }
            } catch (error) {
                console.error(`Health check failed for bot ${bot.id}:`, error);
                await this.stopBot(bot.id);
            }
        }
    }
}

// Website deployment manager
class WebsiteManager {
    constructor() {
        this.deployedWebsites = new Map();
    }

    // Deploy a website
    async deployWebsite(websiteId, websitePath, domain) {
        try {
            if (this.deployedWebsites.has(websiteId)) {
                console.log(`Website ${websiteId} is already deployed`);
                return false;
            }

            // In a real implementation, you would:
            // 1. Extract website files if compressed
            // 2. Set up virtual host or subdomain
            // 3. Configure web server (Nginx/Apache)
            // 4. Set up SSL certificate
            // 5. Configure CDN if needed

            const deployment = {
                id: websiteId,
                domain: domain || `${websiteId}.localhost`,
                deployTime: new Date(),
                status: 'active',
                url: `https://${domain || `${websiteId}.localhost`}`
            };

            this.deployedWebsites.set(websiteId, deployment);
            await this.updateWebsiteStatus(websiteId, 'active');
            
            console.log(`Website ${websiteId} deployed successfully at ${deployment.url}`);
            return deployment;
        } catch (error) {
            console.error(`Error deploying website ${websiteId}:`, error);
            await this.updateWebsiteStatus(websiteId, 'error');
            return false;
        }
    }

    // Undeploy a website
    async undeployWebsite(websiteId) {
        try {
            const deployment = this.deployedWebsites.get(websiteId);
            if (!deployment) {
                console.log(`Website ${websiteId} is not deployed`);
                return false;
            }

            // In a real implementation, you would:
            // 1. Remove virtual host configuration
            // 2. Clean up website files
            // 3. Remove SSL certificates
            // 4. Update DNS if needed

            this.deployedWebsites.delete(websiteId);
            await this.updateWebsiteStatus(websiteId, 'inactive');
            
            console.log(`Website ${websiteId} undeployed successfully`);
            return true;
        } catch (error) {
            console.error(`Error undeploying website ${websiteId}:`, error);
            return false;
        }
    }

    // Update website status in database
    async updateWebsiteStatus(websiteId, status) {
        return new Promise((resolve, reject) => {
            db.run(
                'UPDATE websites SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [status, websiteId],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.changes);
                }
            );
        });
    }

    // Get all deployed websites
    getDeployedWebsites() {
        return Array.from(this.deployedWebsites.values());
    }
}

// Initialize managers
const botManager = new BotManager();
const websiteManager = new WebsiteManager();

// Scheduled tasks

// Health check for bots - runs every 5 minutes
cron.schedule('*/5 * * * *', async () => {
    console.log('Running bot health checks...');
    await botManager.healthCheck();
});

// Cleanup old sessions - runs daily at 3 AM
cron.schedule('0 3 * * *', () => {
    console.log('Cleaning up old sessions...');
    db.run('DELETE FROM sessions WHERE expires_at < CURRENT_TIMESTAMP', (err) => {
        if (err) {
            console.error('Error cleaning up sessions:', err);
        } else {
            console.log('Old sessions cleaned up successfully');
        }
    });
});

// Deployment status check - runs every 10 minutes
cron.schedule('*/10 * * * *', async () => {
    console.log('Checking deployment status...');
    
    // Check for bots that should be running but aren't
    db.all('SELECT * FROM bots WHERE status = "running"', async (err, bots) => {
        if (err) {
            console.error('Error checking running bots:', err);
            return;
        }

        for (const bot of bots) {
            if (!botManager.runningBots.has(bot.id)) {
                console.log(`Restarting bot ${bot.id} - found in database but not running`);
                await botManager.startBot(bot.id, bot.file_path, bot.config);
            }
        }
    });

    // Check for websites that should be active but aren't
    db.all('SELECT * FROM websites WHERE status = "active"', async (err, websites) => {
        if (err) {
            console.error('Error checking active websites:', err);
            return;
        }

        for (const website of websites) {
            if (!websiteManager.deployedWebsites.has(website.id)) {
                console.log(`Redeploying website ${website.id} - found in database but not deployed`);
                await websiteManager.deployWebsite(website.id, website.file_path, website.domain);
            }
        }
    });
});

// Backup task - runs daily at 4 AM
cron.schedule('0 4 * * *', async () => {
    console.log('Running daily backup...');
    
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupDir = path.join(__dirname, 'backups');
        
        // Create backup directory if it doesn't exist
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }

        // Backup database
        const backupPath = path.join(backupDir, `database-backup-${timestamp}.sqlite`);
        fs.copyFileSync(process.env.DATABASE_PATH || './database.sqlite', backupPath);
        
        console.log(`Database backed up to ${backupPath}`);
        
        // Clean up old backups (keep last 7 days)
        const files = fs.readdirSync(backupDir);
        const backupFiles = files.filter(file => file.startsWith('database-backup-'));
        
        if (backupFiles.length > 7) {
            backupFiles.sort();
            const filesToDelete = backupFiles.slice(0, backupFiles.length - 7);
            
            filesToDelete.forEach(file => {
                fs.unlinkSync(path.join(backupDir, file));
                console.log(`Deleted old backup: ${file}`);
            });
        }
    } catch (error) {
        console.error('Error during backup:', error);
    }
});

// API for external communication
class WorkerAPI {
    constructor() {
        this.setupRoutes();
    }

    setupRoutes() {
        // This would be used if you want to expose an API from the worker
        // For now, we'll just log the setup
        console.log('Worker API routes configured');
    }

    // Start bot via API call
    async startBotAPI(botId, botPath, config) {
        return await botManager.startBot(botId, botPath, config);
    }

    // Stop bot via API call
    async stopBotAPI(botId) {
        return await botManager.stopBot(botId);
    }

    // Deploy website via API call
    async deployWebsiteAPI(websiteId, websitePath, domain) {
        return await websiteManager.deployWebsite(websiteId, websitePath, domain);
    }

    // Undeploy website via API call
    async undeployWebsiteAPI(websiteId) {
        return await websiteManager.undeployWebsite(websiteId);
    }
}

// Initialize worker API
const workerAPI = new WorkerAPI();

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('Received SIGTERM, shutting down gracefully...');
    
    // Stop all running bots
    const runningBots = botManager.getRunningBots();
    Promise.all(runningBots.map(bot => botManager.stopBot(bot.id)))
        .then(() => {
            console.log('All bots stopped');
            process.exit(0);
        })
        .catch(error => {
            console.error('Error during shutdown:', error);
            process.exit(1);
        });
});

process.on('SIGINT', () => {
    console.log('Received SIGINT, shutting down gracefully...');
    process.exit(0);
});

// Worker startup
console.log('Bot Hosting Platform Worker started');
console.log('Scheduled tasks:');
console.log('- Bot health checks: every 5 minutes');
console.log('- Session cleanup: daily at 3 AM');
console.log('- Deployment status check: every 10 minutes');
console.log('- Database backup: daily at 4 AM');

// Initial startup tasks
async function initializeWorker() {
    try {
        console.log('Initializing worker...');
        
        // Restore running bots from database
        db.all('SELECT * FROM bots WHERE status = "running"', async (err, bots) => {
            if (err) {
                console.error('Error loading running bots:', err);
                return;
            }

            console.log(`Found ${bots.length} bots to restart`);
            
            for (const bot of bots) {
                await botManager.startBot(bot.id, bot.file_path, bot.config);
            }
        });

        // Restore active websites from database
        db.all('SELECT * FROM websites WHERE status = "active"', async (err, websites) => {
            if (err) {
                console.error('Error loading active websites:', err);
                return;
            }

            console.log(`Found ${websites.length} websites to redeploy`);
            
            for (const website of websites) {
                await websiteManager.deployWebsite(website.id, website.file_path, website.domain);
            }
        });
        
        console.log('Worker initialization complete');
    } catch (error) {
        console.error('Error initializing worker:', error);
    }
}

// Start initialization
initializeWorker();

module.exports = { BotManager, WebsiteManager, WorkerAPI };