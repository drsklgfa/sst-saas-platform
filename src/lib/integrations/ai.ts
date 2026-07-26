import {env} from '../env';
export interface AIProvider{complete(input:{system:string;prompt:string}):Promise<string>}
class DisabledAI implements AIProvider{async complete():Promise<string>{throw new Error('IA desativada')}}
class GeminiAI implements AIProvider{async complete(input:{system:string;prompt:string}){if(!env.GEMINI_API_KEY)throw new Error('GEMINI_API_KEY ausente');const response=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${env.GEMINI_MODEL}:generateContent?key=${env.GEMINI_API_KEY}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({system_instruction:{parts:[{text:input.system}]},contents:[{parts:[{text:input.prompt}]}]})});if(!response.ok)throw new Error(`Gemini: ${response.status}`);const json=await response.json();return json.candidates?.[0]?.content?.parts?.map((p:any)=>p.text).join('')??''}}
export const ai:AIProvider=env.AI_PROVIDER==='gemini'?new GeminiAI():new DisabledAI();
