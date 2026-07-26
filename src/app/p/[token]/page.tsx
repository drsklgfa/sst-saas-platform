import { notFound } from 'next/navigation';
import { PublicQuestionnaire } from '@/components/public-questionnaire';
import { campaignAvailability } from '@/domain/campaigns';
import { db } from '@/lib/db';

function settingString(settings: unknown, key: string): string | null {
  if (!settings || typeof settings !== 'object') return null;
  const value = (settings as Record<string, unknown>)[key];
  return typeof value === 'string' && value.trim() ? value : null;
}

export default async function PublicCampaign({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const campaign = await db.campaign.findFirst({
    where: { OR: [{ publicToken: token }, { targets: { some: { token } } }] },
    include: { company: true, targets: { select: { token: true } }, questionnaires: { include: { questionnaireVersion: { include: { questions: { include: { options: true }, orderBy: { position: 'asc' } } } } }, orderBy: { position: 'asc' } } },
  });
  if (!campaign) notFound();
  const target = campaign.targets.find((candidate) => candidate.token === token);
  if (campaign.targets.length > 0 && !target) return <main className="shell flex min-h-screen items-center justify-center p-5"><div className="max-w-lg rounded-2xl bg-white p-8 text-center shadow-soft"><h1 className="text-2xl font-bold">Link de grupo necessário</h1><p className="mt-2 text-slate-500">Solicite o link ou QR Code correspondente ao seu grupo de trabalho.</p></div></main>;
  const availability = campaignAvailability(campaign);
  if (availability !== 'OPEN') {
    const message = availability === 'SCHEDULED' ? 'Esta pesquisa ainda não foi aberta.' : availability === 'PAUSED' ? 'Esta pesquisa está temporariamente pausada.' : 'Esta pesquisa foi encerrada ou está indisponível.';
    return <main className="shell flex min-h-screen items-center justify-center p-5"><div className="max-w-lg rounded-2xl bg-white p-8 text-center shadow-soft"><h1 className="text-2xl font-bold">Campanha indisponível</h1><p className="mt-2 text-slate-500">{message}</p></div></main>;
  }
  const instructions = campaign.questionnaires.map((item) => item.questionnaireVersion.instructions).filter(Boolean).join('\n\n') || null;
  const questions = campaign.questionnaires.flatMap((item) => item.questionnaireVersion.questions.map((question) => ({
    id: question.id,
    code: question.code,
    text: question.text,
    helpText: question.helpText,
    type: question.type,
    required: question.required,
    minValue: question.minValue,
    maxValue: question.maxValue,
    conditions: question.conditions,
    options: question.options.sort((a, b) => a.position - b.position).map((option) => ({ value: option.value, label: option.label })),
  })));
  return <main className="shell flex min-h-screen items-center justify-center p-4"><div className="w-full max-w-2xl"><p className="mb-3 text-center text-xs text-slate-500">Pesquisa anônima: não solicitamos nome, CPF, matrícula, telefone ou e-mail. Não tente incluir identificação em campos de texto.</p><PublicQuestionnaire token={token} title={campaign.name} company={campaign.company.tradeName ?? campaign.company.legalName} instructions={instructions} privacyNotice={settingString(campaign.settings, 'privacyNotice')} anonymousCodesEnabled={campaign.anonymousCodesEnabled} questions={questions} /></div></main>;
}
