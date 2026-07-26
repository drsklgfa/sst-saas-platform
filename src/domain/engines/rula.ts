export type RulaInput={upperArm:number;lowerArm:number;wrist:number;wristTwist:number;neck:number;trunk:number;legs:number;muscleUse?:0|1;forceLoad?:0|1|2|3};
const tableA:number[][]=[[1,2,2,3],[2,2,3,3],[2,3,3,4],[3,3,4,4],[4,4,4,5],[5,5,5,6]];
const tableB:number[][]=[[1,2,3,3,4,5],[2,2,3,4,4,5],[3,3,3,4,5,6],[3,3,4,5,6,6],[4,4,5,6,6,7],[5,5,6,6,7,7]];
export function calculateRula(i:RulaInput){
  const a=tableA[Math.max(0,Math.min(5,i.upperArm-1))][Math.max(0,Math.min(3,i.lowerArm-1))]+Math.max(0,i.wrist-1)+Math.max(0,i.wristTwist-1);
  const b=tableB[Math.max(0,Math.min(5,i.neck-1))][Math.max(0,Math.min(5,i.trunk-1))]+Math.max(0,i.legs-1);
  const adjustedA=Math.min(8,a+(i.muscleUse??0)+(i.forceLoad??0)); const adjustedB=Math.min(7,b+(i.muscleUse??0)+(i.forceLoad??0));
  const score=Math.min(7,Math.max(1,Math.ceil((adjustedA+adjustedB)/2)));
  const action=score<=2?'ACEITÁVEL':score<=4?'INVESTIGAR':score<=6?'MUDANÇAS EM CURTO PRAZO':'MUDANÇAS IMEDIATAS'; return {score,action,groupA:adjustedA,groupB:adjustedB};
}
