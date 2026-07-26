export type RebaInput={trunk:number;neck:number;legs:number;upperArm:number;lowerArm:number;wrist:number;load:number;coupling:number;activity:number};
export function calculateReba(i:RebaInput){
  const groupA=Math.min(12,i.trunk+i.neck+i.legs+i.load); const groupB=Math.min(12,i.upperArm+i.lowerArm+i.wrist+i.coupling);
  const score=Math.min(15,Math.max(1,Math.ceil((groupA+groupB)/2)+i.activity));
  const level=score===1?'DESPREZÍVEL':score<=3?'BAIXO':score<=7?'MÉDIO':score<=10?'ALTO':'MUITO ALTO';
  return {score,level,action:score<=3?'Pode ser necessária':score<=7?'Necessária':score<=10?'Necessária em breve':'Necessária imediatamente'};
}
