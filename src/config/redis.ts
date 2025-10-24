import { createClient, type RedisClientType } from "redis";
import {config}  from "./index";

// Redis client configuration with improved error handling and timeouts
export const redisClient: RedisClientType = createClient({
    username: 'default',
    password: config.redisPassword,
    socket: {
        host: config.redisHost,
        port: config.redisPort,
        connectTimeout: 10000, // 10 seconds
        reconnectStrategy: (retries) => {
            if (retries > 5) {
                console.log('❌ Redis max retries exceeded');
                return new Error('Redis max retries exceeded');
            }
            const delay = Math.min(retries * 50, 500);
            console.log(`🔄 Redis reconnecting in ${delay}ms (attempt ${retries})`);
            return delay;
        }
    }
});

// Enhanced error handling
redisClient.on("error", (err) => {
    console.error("❌ Redis Client Error:", err.message);
    if (err.code === 'ECONNRESET') {
        console.log('🔄 Redis connection was reset, will attempt to reconnect...');
    }
});

redisClient.on("connect", () => {
    console.log("🔗 Redis client connected");
});

redisClient.on("ready", () => {
    console.log("✅ Redis client ready");
});

redisClient.on("end", () => {
    console.log("🔌 Redis connection ended");
});

redisClient.on("reconnecting", () => {
    console.log("🔄 Redis client reconnecting...");
});

export async function connectRedis(): Promise<void> {
    try {
        console.log("🔗 Connecting to Redis...");
        
        if (!redisClient.isOpen) {
            await redisClient.connect();
            console.log("✅ Redis connected successfully");
            
            // Test the connection
            await redisClient.ping();
            console.log("🏓 Redis ping successful");
        } else {
            console.log("ℹ️ Redis already connected");
        }
    } catch (error) {
        console.error("❌ Failed to connect to Redis:", error);
        throw error;
    }
}

export async function disconnectRedis(): Promise<void> {
    try {
        if (redisClient.isOpen) {
            await redisClient.quit();
            console.log("👋 Redis disconnected gracefully");
        }
    } catch (error) {
        console.error("❌ Error disconnecting Redis:", error);
        // Force close if graceful quit fails
        await redisClient.disconnect();
    }
}

// Health check function
export async function checkRedisHealth(): Promise<boolean> {
    try {
        if (!redisClient.isOpen) {
            return false;
        }
        await redisClient.ping();
        return true;
    } catch (error) {
        console.error("❌ Redis health check failed:", error);
        return false;
    }
}