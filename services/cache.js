const mongoose = require('mongoose');
const redis = require('redis');
const util = require('util');

const redisUrl = 'redis://127.0.0.1:6379';
const client = redis.createClient(redisUrl);
client.hget = util.promisify(client.hget);
const exec = mongoose.Query.prototype.exec;

mongoose.Query.prototype.cache = function (options = {}) {
    this.useCache = true;
    this.hashKey = JSON.stringify(options.key || '');

    return this;
}

mongoose.Query.prototype.exec = async function () {
    if (!this.useCache) {
        return exec.apply(this, arguments);
    }

    const key = JSON.stringify(
        Object.assign({}, this.getQuery(), { collection: this.mongooseCollection.name })
    );

    // see if we have value in redis
    const cacheValue = await client.hget(this.hashKey, key);

    // if we do return that
    if (cacheValue) {
        console.log('FROM CACHE');
        // we need to transform json value from cache to mongoose model, because exec returns mongoose models
        const doc = JSON.parse(cacheValue);

        return Array.isArray(doc) ? doc.map(d => new this.model(d)) : new this.model(doc);
    }

    // otherwise, issue query to db and store results in redis
    const result = await exec.apply(this, arguments);

    // before storing to redis, result form db must be converted to string because redis works with strings
    client.hset(this.hashKey, key, JSON.stringify(result), 'EX', 10);

    console.log('FROM DB');
    return result;
}

module.exports = {
    clearHash(hashKey) {
        client.del(JSON.stringify(hashKey));
    }
}