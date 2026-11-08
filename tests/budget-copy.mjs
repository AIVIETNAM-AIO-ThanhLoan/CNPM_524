import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import nextEnv from '@next/env';
import mysql from 'mysql2/promise';
import { databaseConfig } from '../database/config.mjs';
import { rolloverBudgets } from '../app/lib/budget-rollover.mjs';
nextEnv.loadEnvConfig(process.cwd());
const db=await mysql.createConnection(databaseConfig());
try {
 await db.beginTransaction();
 const user=randomUUID();
 await db.execute('INSERT INTO users (id,name,account,password_hash) VALUES (?,?,?,?)',[user,'Rollover test',user,'unused']);
 const categories=[];
 for(let i=0;i<3;i++) {
  const account=randomUUID(), category=randomUUID();categories.push(category);
  await db.execute("INSERT INTO accounts (id,user_id,name,kind) VALUES (?,?,?,'expense')",[account,user,`test${i}`]);
  await db.execute("INSERT INTO categories (id,user_id,account_id,name,kind,archived) VALUES (?,?,?,?,'expense',?)",[category,user,account,`test${i}`,i===2]);
  await db.execute('INSERT INTO budgets (id,user_id,category_id,month_start,amount) VALUES (?,?,?,?,?)',[randomUUID(),user,category,'2026-12-01','123456.78']);
 }
 await db.execute('INSERT INTO budgets (id,user_id,category_id,month_start,amount) VALUES (?,?,?,?,?)',[randomUUID(),user,categories[1],'2027-01-01','99.99']);
 const budgets=async month=>(await db.execute('SELECT category_id,amount FROM budgets WHERE user_id=? AND month_start=? ORDER BY amount',[user,month]))[0];
 await rolloverBudgets(db,user,'2027-01-01');
 let result=await budgets('2027-01-01');
 assert.equal(result.length,2);assert.equal(result[0].amount,'99.99');assert.equal(result[1].amount,'123456.78');
 await rolloverBudgets(db,user,'2027-01-01');assert.equal((await budgets('2027-01-01')).length,2);
 await rolloverBudgets(db,user,'2027-06-01');
 assert.equal((await budgets('2027-06-01')).length,2);
 await db.execute('DELETE FROM budgets WHERE user_id=? AND month_start=?',[user,'2027-06-01']);
 await rolloverBudgets(db,user,'2027-06-01');assert.equal((await budgets('2027-06-01')).length,0);
 await rolloverBudgets(db,user,'2027-09-01');assert.equal((await budgets('2027-09-01')).length,0);
 const other=randomUUID();
 await db.execute('INSERT INTO users (id,name,account,password_hash) VALUES (?,?,?,?)',[other,'Other test',other,'unused']);
 await rolloverBudgets(db,other,'2027-01-01');
 assert.equal((await db.execute('SELECT id FROM budgets WHERE user_id=?',[other]))[0].length,0);
 console.log('PASS: real DB rollover, year boundary, preserved existing limits, archived exclusion, repeat calls, deletions, skipped months and account isolation. Fixtures rolled back.');
} finally {await db.rollback();await db.end();}
