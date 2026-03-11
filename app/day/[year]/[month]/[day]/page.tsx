import { DayScreen } from "@/components/day/day-screen";

type DayPageProps = {
  params: {
    day: string;
    month: string;
    year: string;
  };
};

export default function DayPage({ params }: DayPageProps) {
  const year = Number(params.year);
  const month = Number(params.month);
  const day = Number(params.day);

  return <DayScreen day={day} month={month} year={year} />;
}
