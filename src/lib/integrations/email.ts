import {env} from '../env';
export interface EmailProvider{send(input:{to:string;subject:string;html:string;replyTo?:string}):Promise<{id:string}>}
class DisabledEmail implements EmailProvider{async send():Promise<{id:string}>{throw new Error('E-mail automático desativado')}}
class ResendEmail implements EmailProvider{async send(input:{to:string;subject:string;html:string;replyTo?:string}){if(!env.RESEND_API_KEY||!env.EMAIL_FROM)throw new Error('Resend não configurado');const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{authorization:`Bearer ${env.RESEND_API_KEY}`,'content-type':'application/json'},body:JSON.stringify({from:env.EMAIL_FROM,...input})});if(!r.ok)throw new Error(`Resend: ${r.status}`);return r.json()}}
export const email:EmailProvider=env.EMAIL_PROVIDER==='resend'?new ResendEmail():new DisabledEmail();
