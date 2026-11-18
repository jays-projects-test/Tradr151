import "jsr:@supabase/functions-js/edge-runtime.d.ts";
const cors={
  "Access-Control-Allow-Origin":"https://jays-projects-test.github.io",
  "Access-Control-Allow-Methods":"POST, OPTIONS",
  "Access-Control-Allow-Headers":"authorization,apikey,content-type,x-client-info",
  "Content-Type":"application/json"
};
const reply=(payload:unknown,status=200)=>new Response(JSON.stringify(payload),{status,headers:cors});
Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors});
  if(req.method!=="POST")return reply({error:"method_not_allowed"},405);
  const key=Deno.env.get("GEMINI_API_KEY");
  if(!key)return reply({error:"ai_not_configured",message:"Set GEMINI_API_KEY in Supabase Edge Function secrets."},503);
  try{
    const body=await req.json();
    const image=body?.imageBase64;
    const mime=body?.mimeType;
    if(typeof image!=="string"||image.length>8_000_000||image.length<100||!["image/jpeg","image/png","image/webp"].includes(mime))return reply({error:"invalid_image",message:"Upload JPEG, PNG or WebP under 6 MB."},400);
    const instruction="Identify the Pokémon TCG card shown in this image. Return JSON with keys name, printedNumber, setHint, language, edition, finish, confidence, notes. Recognise the actual depicted text and artwork, but never fabricate missing information. If unsure, set the property to null and confidence to low. Do not claim PSA grade, condition, or market price from an image. Never include private info. Exact printing must be confirmed by the user.";
    const response=await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",{
      method:"POST",
      headers:{"x-goog-api-key":key,"Content-Type":"application/json"},
      body:JSON.stringify({contents:[{parts:[{text:instruction},{inline_data:{mime_type:mime,data:image}}]}],generationConfig:{responseMimeType:"application/json",temperature:0.1}})
    });
    if(!response.ok)return reply({error:"ai_provider_unavailable",status:response.status},502);
    const result=await response.json();
    const text=result.candidates?.[0]?.content?.parts?.map((x:{text?:string})=>x.text||"").join("")||"{}";
    const found=JSON.parse(text);
    return reply({result:found,requiresConfirmation:true,source:"Gemini vision"});
  }catch(e){console.error("AI identification failed",e);return reply({error:"identification_failed"},500);}
});