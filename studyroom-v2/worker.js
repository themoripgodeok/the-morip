export default {
  async fetch(request, env) {
    const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type, X-Admin-Key", "Access-Control-Allow-Methods": "GET,POST,OPTIONS" };
    if (request.method === "OPTIONS") return new Response(null,{headers:cors});
    const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,"Content-Type":"application/json; charset=utf-8"}});
    try {
      const url=new URL(request.url), action=url.searchParams.get("action");
      if(request.method==="GET" && action==="health") return json({ok:true,service:"the-morip-studyroom"});
      if(request.method==="GET" && action==="availability"){
        const date=url.searchParams.get("date"); if(!/^\d{4}-\d{2}-\d{2}$/.test(date||"")) return json({error:"날짜를 확인해 주세요."},400);
        const {results}=await env.DB.prepare("SELECT start_at,end_at FROM bookings WHERE date=? AND status='active'").bind(date).all();
        return json({busy:results});
      }
      if(request.method!=="POST") return json({error:"지원하지 않는 요청입니다."},405);
      const b=await request.json();
      if(action==="register"){
        const name=String(b.name||"").trim(), seat=String(b.seat||"").trim(), pin=String(b.pin||"");
        if(!name||!seat||!/^[0-9]{4,8}$/.test(pin)) return json({error:"이름·좌석·4~8자리 PIN을 확인해 주세요."},400);
        const salt=crypto.getRandomValues(new Uint8Array(16)), hash=await pinHash(pin,salt);
        await env.DB.prepare("INSERT INTO members(name,seat,salt,pin_hash,created_at) VALUES(?,?,?,?,?)").bind(name,seat,toHex(salt),hash,new Date().toISOString()).run();
        return json({ok:true});
      }
      if(action==="book"){
        const name=String(b.name||"").trim(),seat=String(b.seat||"").trim(),pin=String(b.pin||""),date=String(b.date||""),start=String(b.start||""),end=String(b.end||"");
        const m=await env.DB.prepare("SELECT id,salt,pin_hash FROM members WHERE name=? AND seat=?").bind(name,seat).first();
        if(!m||await pinHash(pin,fromHex(m.salt))!==m.pin_hash) return json({error:"회원정보 또는 PIN이 일치하지 않습니다."},401);
        if(!validSlot(date,start,end)) return json({error:"예약 시간은 08:00~24:00, 1시간 단위입니다."},400);
        const id=crypto.randomUUID();
        try { await env.DB.prepare("INSERT INTO bookings(id,date,start_at,end_at,member_id,status,created_at) VALUES(?,?,?,?,?,'active',?)").bind(id,date,start,end,m.id,new Date().toISOString()).run(); }
        catch(e){return json({error:"해당 시간은 이미 예약되었거나 예약할 수 없습니다."},409);}
        return json({ok:true,id});
      }
      if(action==="myBookings"){
        const m=await memberAuth(env,b); if(!m) return json({error:"회원정보 또는 PIN이 일치하지 않습니다."},401);
        const {results}=await env.DB.prepare("SELECT id,date,start_at,end_at,status FROM bookings WHERE member_id=? AND status='active' AND date>=? ORDER BY date,start_at").bind(m.id,new Date().toISOString().slice(0,10)).all();
        return json({bookings:results});
      }
      if(action==="cancel"){
        const m=await memberAuth(env,b); if(!m) return json({error:"회원정보 또는 PIN이 일치하지 않습니다."},401);
        const r=await env.DB.prepare("UPDATE bookings SET status='cancelled' WHERE id=? AND member_id=? AND status='active'").bind(b.id,m.id).run();
        return json({ok:r.meta.changes>0});
      }
      if(action==="adminList"){
        if(b.adminKey!==env.ADMIN_KEY) return json({error:"관리자 인증 실패"},403);
        const date=String(b.date||"");const {results}=await env.DB.prepare("SELECT bookings.id,date,start_at,end_at,bookings.status,members.name,members.seat FROM bookings JOIN members ON members.id=bookings.member_id WHERE date=? ORDER BY start_at").bind(date).all();
        return json({bookings:results});
      }
      if(action==="adminCancel"){
        if(b.adminKey!==env.ADMIN_KEY) return json({error:"관리자 인증 실패"},403);
        await env.DB.prepare("UPDATE bookings SET status='cancelled' WHERE id=? AND status='active'").bind(b.id).run();return json({ok:true});
      }
      return json({error:"알 수 없는 action"},404);
    } catch(e){ return json({error:"서버 처리 중 오류가 발생했습니다."},500); }
  }
};
function toHex(a){return [...a].map(x=>x.toString(16).padStart(2,"0")).join("")}
function fromHex(s){return new Uint8Array((s.match(/../g)||[]).map(x=>parseInt(x,16)))}
async function pinHash(pin,salt){const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(pin),"PBKDF2",false,["deriveBits"]);const bits=await crypto.subtle.deriveBits({name:"PBKDF2",salt,iterations:120000,hash:"SHA-256"},key,256);return toHex(new Uint8Array(bits))}
async function memberAuth(env,b){const m=await env.DB.prepare("SELECT id,salt,pin_hash FROM members WHERE name=? AND seat=?").bind(String(b.name||""),String(b.seat||"")).first();if(!m||await pinHash(String(b.pin||""),fromHex(m.salt))!==m.pin_hash)return null;return m}
function validSlot(d,s,e){if(!/^\d{4}-\d{2}-\d{2}$/.test(d)||!/^\d{2}:00$/.test(s)||!(/^\d{2}:00$/.test(e)||e==="24:00"))return false;const a=Number(s.slice(0,2)),z=e==="24:00"?24:Number(e.slice(0,2));return a>=8&&z<=24&&z>a}
