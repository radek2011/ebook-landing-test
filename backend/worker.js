// Cloudflare Worker + D1 + Resend. Deploy separately; no secrets in frontend.
// Required bindings: DB (D1), RESEND_API_KEY, FROM_EMAIL (verified), PUBLIC_ORIGIN,
// SAMPLE_PDF_URL (public URL of the approved 5-page PDF), SITE_URL.
const json=(o,s=200,origin="")=>new Response(JSON.stringify(o),{status:s,headers:{"content-type":"application/json;charset=utf-8",...(origin?{"access-control-allow-origin":origin,"vary":"Origin"}:{})}});
const sha=async s=>Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s)))).map(x=>x.toString(16).padStart(2,"0")).join("");
const escapeHtml=s=>s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
async function emailSend(env,to,subject,html){
 const res=await fetch("https://api.resend.com/emails",{method:"POST",headers:{"Authorization":"Bearer "+env.RESEND_API_KEY,"Content-Type":"application/json"},body:JSON.stringify({from:env.FROM_EMAIL,to:[to],subject,html})});
 if(!res.ok)throw new Error("Email provider refused send: "+res.status);
}
export default {async fetch(req,env){
 const url=new URL(req.url),path=url.pathname,origin=req.headers.get("Origin")||"",allowed=origin===env.PUBLIC_ORIGIN?origin:"";
 if(req.method==="OPTIONS"&&allowed)return new Response(null,{status:204,headers:{"Access-Control-Allow-Origin":allowed,"Access-Control-Allow-Headers":"Content-Type","Access-Control-Allow-Methods":"GET,POST,OPTIONS","Access-Control-Max-Age":"600"}});
 if(path==="/health")return json({ok:true},200,allowed);
 if(path==="/public-stats"&&req.method==="GET"){
   // Expose only real confirmed waitlist subscribers; never fabricate a number.
   const r=await env.DB.prepare("SELECT count(*) AS n FROM leads WHERE kind='waitlist' AND confirmed_at IS NOT NULL").first();
   return json({confirmedWaitlist:r?.n||0},200,allowed);
 }
 if(path==="/subscribe"&&req.method==="POST"){
   if(!allowed)return json({error:"Origin not allowed."},403);
   if(!env.DB||!env.RESEND_API_KEY||!env.FROM_EMAIL||!env.SITE_URL)return json({error:"System zapisów nie jest skonfigurowany."},503,allowed);
   if(Number(req.headers.get("Content-Length")||0)>5000)return json({error:"Too large."},413,allowed);
   let data;try{data=await req.json()}catch{return json({error:"Niepoprawny formularz."},400,allowed)}
   if(data.hp)return json({accepted:true},200,allowed);
   const email=String(data.email||"").trim().toLowerCase(),kind=data.kind;
   if(email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)||!["sample","waitlist"].includes(kind))return json({error:"Niepoprawne dane."},400,allowed);
   const token=crypto.randomUUID()+crypto.randomUUID(),hash=await sha(token);
   const utm=data.utm||{};
   await env.DB.prepare("INSERT INTO leads(email,kind,token_hash,created_at,expires_at,newsletter,utm_source,utm_medium,utm_campaign,utm_content,utm_term) VALUES(?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(email,kind) DO UPDATE SET token_hash=excluded.token_hash,expires_at=excluded.expires_at,newsletter=excluded.newsletter,utm_source=excluded.utm_source,utm_medium=excluded.utm_medium,utm_campaign=excluded.utm_campaign,utm_content=excluded.utm_content,utm_term=excluded.utm_term")
    .bind(email,kind,hash,new Date().toISOString(),Date.now()+48*3600*1000,data.newsletter?1:0,...["utm_source","utm_medium","utm_campaign","utm_content","utm_term"].map(k=>String(utm[k]||"").slice(0,120))).run();
   const link=new URL("/verify",url.origin);link.searchParams.set("token",token);link.searchParams.set("email",email);link.searchParams.set("kind",kind);
   try{await emailSend(env,email,"Potwierdź adres — Mentor Przewagi",'<div style="font:16px Arial,sans-serif;max-width:520px"><h2>Mentor Przewagi</h2><p>Potwierdź swój adres, aby '+(kind==="sample"?"otrzymać link do bezpłatnych 5 stron PDF.":"dołączyć do listy informacyjnej o premierowej przedsprzedaży.")+'</p><p><a href="'+escapeHtml(link.toString())+'">Potwierdź adres e-mail</a></p><p>Link jest ważny 48 godzin. Jeśli to nie Ty wypełniłeś formularz, zignoruj tę wiadomość.</p></div>')}
   catch(e){return json({error:"Nie udało się wysłać potwierdzenia. Spróbuj ponownie."},503,allowed)}
   return json({accepted:true},202,allowed);
 }
 if(path==="/verify"&&req.method==="GET"){
   const token=url.searchParams.get("token")||"",email=(url.searchParams.get("email")||"").toLowerCase(),kind=url.searchParams.get("kind")||"";
   if(token.length>100||!["sample","waitlist"].includes(kind))return new Response("Nieprawidłowy link.",{status:400});
   const hash=await sha(token);
   const rec=await env.DB.prepare("SELECT email,confirmed_at,expires_at FROM leads WHERE email=? AND kind=? AND token_hash=?").bind(email,kind,hash).first();
   if(!rec||rec.expires_at<Date.now())return new Response("Link nieważny lub wygasł.",{status:400});
   if(!rec.confirmed_at)await env.DB.prepare("UPDATE leads SET confirmed_at=? WHERE email=? AND kind=? AND token_hash=?").bind(new Date().toISOString(),email,kind,hash).run();
   if(kind==="sample"){
      if(!env.SAMPLE_PDF_URL)return new Response("Zapis potwierdzony, PDF jeszcze nieopublikowany. Skontaktuj się z wydawcą.");
      return Response.redirect(env.SAMPLE_PDF_URL,302);
   }
   const target=new URL(env.SITE_URL);target.searchParams.set("confirmed","waitlist");
   return Response.redirect(target.toString(),302);
 }
 if(path==="/admin/summary"&&req.method==="GET"){
   if(!env.ADMIN_TOKEN||req.headers.get("Authorization")!=="Bearer "+env.ADMIN_TOKEN)return json({error:"Unauthorized"},401);
   const rows=await env.DB.prepare("SELECT kind,COALESCE(utm_source,'(direct)') AS source,COALESCE(utm_campaign,'(none)') AS campaign,COUNT(*) AS initiated,SUM(CASE WHEN confirmed_at IS NOT NULL THEN 1 ELSE 0 END) AS confirmed FROM leads GROUP BY kind,source,campaign ORDER BY initiated DESC").all();
   return json({byCampaign:rows.results});
 }
 return json({error:"Not found"},404,allowed);
}};
