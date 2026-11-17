const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');
const fs = require('fs');
const app = express();
app.use(cors());
app.use(express.json());
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
let db = { tokens: [], reminders: [] };
if (fs.existsSync('db.json')) { try { db = JSON.parse(fs.readFileSync('db.json','utf8')); } catch(e){} }
function saveDb(){ fs.writeFileSync('db.json', JSON.stringify(db)); }
app.get('/', (req,res)=> res.send('تذكيري شغال - عدد التوكنات: '+db.tokens.length));
app.post('/register-token', (req,res)=>{ const { token } = req.body; if(token && !db.tokens.includes(token)){ db.tokens.push(token); saveDb(); } res.json({ ok:true }); });
app.post('/sync', (req,res)=>{ const { token, reminders } = req.body; if(token && !db.tokens.includes(token)){ db.tokens.push(token); } if(Array.isArray(reminders)){ db.reminders = db.reminders.filter(r => r._token !== token); reminders.forEach(r => { db.reminders.push({ ...r, _token: token }); }); saveDb(); } res.json({ ok:true }); });
app.get('/test', async (req,res)=>{ if(db.tokens.length===0) return res.send('مافي توكن'); try{ await admin.messaging().send({ token: db.tokens[0], notification:{ title:'اختبار', body:'السيرفر شغال' }}); res.send('تم الارسال'); }catch(e){ res.send('خطأ: '+e.message); } });
setInterval(async ()=>{ const now = Date.now(); for(let it of db.reminders){ if(it.done || it.notifiedServer) continue; const notifyTime = new Date(it.date).getTime() - (it.before||0)*60000; if(now >= notifyTime && now < notifyTime + 30000){ it.notifiedServer = true; saveDb(); for(let token of db.tokens){ try{ await admin.messaging().send({ token, notification:{ title:'تذكيري: '+it.title, body: (it.note||'') + ' - ' + it.date }}); }catch(e){} } } } }, 1000);
const PORT = process.env.PORT || 10000;
app.listen(PORT, ()=> console.log('شغال على '+PORT));
