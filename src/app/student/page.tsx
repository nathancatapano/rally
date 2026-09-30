import type { Metadata } from "next";
import { StudentDemo } from "@/components/student/StudentDemo";

export const metadata: Metadata = {
  title: "Rally: the student experience",
};

export default function StudentPage() {
  return <StudentDemo />;
}
