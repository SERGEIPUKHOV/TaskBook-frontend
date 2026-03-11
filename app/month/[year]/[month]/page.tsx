import { MonthScreen } from "@/components/month/month-screen";

type MonthPageProps = {
  params: {
    year: string;
    month: string;
  };
};

export default function MonthPage({ params }: MonthPageProps) {
  const year = Number(params.year);
  const month = Number(params.month);

  return <MonthScreen year={year} month={month} />;
}
