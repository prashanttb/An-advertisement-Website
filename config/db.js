const path = require('path')
require('dotenv').config({path:path.resolve(__dirname+'/.env')})

const { Pool } = require('pg')


// console.log(process.env.DB_USER)

const isProduction = process.env.NODE_ENV === "production";

const connectionString = `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_DATABASE}`;

// const connectionString = 'postgres://hleptzdrjequkj:783d3831e6c8713bfca51769adfa876595feed3c5b3856221e4b468727bab422@ec2-54-172-219-6.compute-1.amazonaws.com:5432/d3841v5vfmppff';
// const connectionString = 'postgres://fhsfeeelrffwep:521da96f722a69996ab4d8c8a77d74efcc631a2bc7068272993ec1d98c7d9d43@ec2-52-72-252-211.compute-1.amazonaws.com:5432/d2gfgu10532t2d';

const pool =  new Pool({
    connectionString: isProduction ? process.env.DATABASE_URL : connectionString,
    ssl: { rejectUnauthorized: false }
})


module.exports = {pool}