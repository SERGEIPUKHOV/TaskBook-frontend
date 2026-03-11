import { WeekScreen } from "@/components/week/week-screen";

type WeekPageProps = {
  params: {
    year: string;
    week: string;
  };
};

export default function WeekPage({ params }: WeekPageProps) {
  const year = Number(params.year);
  const week = Number(params.week);

  return <WeekScreen year={year} week={week} />;
}
