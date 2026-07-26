export type RiskLevel='VERY_LOW'|'LOW'|'MODERATE'|'HIGH'|'CRITICAL';
export function classifyRisk(score:number):RiskLevel { if(score<=3)return'VERY_LOW'; if(score<=6)return'LOW'; if(score<=10)return'MODERATE'; if(score<=16)return'HIGH'; return'CRITICAL'; }
export function calculateRisk(severity:number,probability:number,exposure=1){
  for(const [n,v] of Object.entries({severity,probability,exposure})) if(!Number.isFinite(v)||v<1||v>5) throw new Error(`${n} deve estar entre 1 e 5`);
  const score=severity*probability*exposure; return {score,level:classifyRisk(score)};
}
