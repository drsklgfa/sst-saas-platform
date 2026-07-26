export function normalizeBrazilPhone(input: string): string {
  const digits = input.replace(/\D/g, '');
  if (!digits) throw new Error('Telefone vazio');
  if (digits.startsWith('55') && digits.length >= 12 && digits.length <= 13) return digits;
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  throw new Error('Telefone brasileiro inválido');
}
export function whatsappUrl(phone:string,message?:string){
  const normalized=normalizeBrazilPhone(phone);
  return `https://wa.me/${normalized}${message?`?text=${encodeURIComponent(message)}`:''}`;
}
