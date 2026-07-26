export type NioshInput={loadKg:number;horizontalCm:number;originHeightCm:number;verticalTravelCm:number;asymmetryDeg:number;frequencyMultiplier:number;couplingMultiplier:number;durationMultiplier?:number};
const clamp=(n:number,min:number,max:number)=>Math.min(max,Math.max(min,n));
export function calculateNiosh(i:NioshInput){
  if(i.loadKg<=0) throw new Error('A carga deve ser positiva');
  const LC=23; const HM=clamp(25/Math.max(i.horizontalCm,25),0,1); const VM=clamp(1-0.003*Math.abs(i.originHeightCm-75),0,1);
  const DM=clamp(0.82+4.5/Math.max(i.verticalTravelCm,25),0,1); const AM=clamp(1-0.0032*Math.abs(i.asymmetryDeg),0,1);
  const FM=clamp(i.frequencyMultiplier,0,1); const CM=clamp(i.couplingMultiplier,0,1); const DUR=clamp(i.durationMultiplier??1,0,1);
  const recommendedLimit=LC*HM*VM*DM*AM*FM*CM*DUR; const liftingIndex=i.loadKg/recommendedLimit;
  return {recommendedLimitKg:Number(recommendedLimit.toFixed(2)),liftingIndex:Number(liftingIndex.toFixed(2)),multipliers:{HM,VM,DM,AM,FM,CM,DUR},classification:liftingIndex<=1?'ACEITÁVEL':liftingIndex<=3?'ATENÇÃO':'ELEVADO'};
}
