export type ScoredAnswer={dimension:string;score:number;min:number;max:number;reverse?:boolean};
export function aggregatePsychosocial(answers:ScoredAnswer[]){
  const groups=new Map<string,number[]>();
  for(const a of answers){const raw=a.reverse?a.max+a.min-a.score:a.score; const normalized=((raw-a.min)/(a.max-a.min))*100; groups.set(a.dimension,[...(groups.get(a.dimension)??[]),normalized]);}
  return [...groups.entries()].map(([dimension,values])=>{const mean=values.reduce((a,b)=>a+b,0)/values.length; return {dimension,score:Number(mean.toFixed(1)),level:mean<33?'FAVORÁVEL':mean<67?'ATENÇÃO':'CRÍTICO',count:values.length};});
}
