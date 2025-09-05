const mysql = require('mysql2/promise');
require('dotenv').config();

// 数据库连接配置
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '123',
  database: process.env.DB_NAME || 'driving_assistant_dev',
  charset: 'utf8mb4',
  timezone: '+08:00'
};

// 连接池配置
const poolConfig = {
  ...dbConfig,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// 创建连接池
const pool = mysql.createPool(poolConfig);

// 测试数据库连接
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ 数据库连接成功');
    }
    connection.release();
    return true;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('❌ 数据库连接失败:', error.message);
    }
    return false;
  }
}

// 执行查询
async function executeQuery(sql, params = []) {
  try {
    const [rows] = await pool.execute(sql, params);
    return rows;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('数据库查询错误:', error);
    }
    throw error;
  }
}

// 执行事务
async function executeTransaction(queries) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    const results = [];
    for (const { sql, params } of queries) {
      const [result] = await connection.execute(sql, params);
      results.push(result);
    }
    
    await connection.commit();
    return results;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// 获取单条记录
async function findOne(table, conditions = {}, fields = '*') {
  const whereClause = Object.keys(conditions).map(key => `${key} = ?`).join(' AND ');
  const values = Object.values(conditions);
  
  const sql = `SELECT ${fields} FROM ${table}${whereClause ? ` WHERE ${whereClause}` : ''} LIMIT 1`;
  const rows = await executeQuery(sql, values);
  return rows[0] || null;
}

// 获取多条记录
async function findMany(table, conditions = {}, options = {}) {
  const { fields = '*', orderBy = '', limit = '', offset = '' } = options;
  
  const whereClause = Object.keys(conditions).map(key => `${key} = ?`).join(' AND ');
  const values = Object.values(conditions);
  
  let sql = `SELECT ${fields} FROM ${table}`;
  if (whereClause) sql += ` WHERE ${whereClause}`;
  if (orderBy) sql += ` ORDER BY ${orderBy}`;
  if (limit) sql += ` LIMIT ${limit}`;
  if (offset) sql += ` OFFSET ${offset}`;
  
  return await executeQuery(sql, values);
}

// 插入记录
async function insertOne(table, data) {
  const fields = Object.keys(data).join(', ');
  const placeholders = Object.keys(data).map(() => '?').join(', ');
  const values = Object.values(data);
  
  const sql = `INSERT INTO ${table} (${fields}) VALUES (${placeholders})`;
  const result = await executeQuery(sql, values);
  return result.insertId;
}

// 更新记录
async function updateOne(table, data, conditions) {
  const setClause = Object.keys(data).map(key => `${key} = ?`).join(', ');
  const whereClause = Object.keys(conditions).map(key => `${key} = ?`).join(' AND ');
  
  const sql = `UPDATE ${table} SET ${setClause} WHERE ${whereClause}`;
  const values = [...Object.values(data), ...Object.values(conditions)];
  
  const result = await executeQuery(sql, values);
  return result.affectedRows;
}

// 删除记录
async function deleteOne(table, conditions) {
  const whereClause = Object.keys(conditions).map(key => `${key} = ?`).join(' AND ');
  const values = Object.values(conditions);
  
  const sql = `DELETE FROM ${table} WHERE ${whereClause}`;
  const result = await executeQuery(sql, values);
  return result.affectedRows;
}

// 初始化数据库连接
testConnection();

module.exports = {
  pool,
  executeQuery,
  executeTransaction,
  findOne,
  findMany,
  insertOne,
  updateOne,
  deleteOne,
  testConnection
};
