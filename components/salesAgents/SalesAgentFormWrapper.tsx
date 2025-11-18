import { notFound } from "next/navigation";
import { parseStringify } from "@/lib/utils";
import { SalesAgentWithRelations, User } from "@/types";
import {
  generateSalesAgentCode,
  getSalesAgentById,
} from "@/lib/actions/salesAgent.actions";
import { SalesAgentForm } from "../forms/SalesAgentForm";
import { getUsers } from "@/lib/actions/user.actions";

interface SalesAgentFormWrapperProps {
  mode: "create" | "edit";
  salesAgentId?: string;
}

export default async function SalesAgentFormWrapper({
  mode,
  salesAgentId,
}: SalesAgentFormWrapperProps) {
  let initialData: SalesAgentWithRelations | undefined;
  let users: User[] = [];
  let generatedAgentCode: string | undefined = undefined;

  if (mode === "create") {
    generatedAgentCode = await generateSalesAgentCode();
  }

  const fetchedUsers = await getUsers(0, 0, true);
  users = parseStringify(fetchedUsers.documents);
  if (mode === "edit") {
    if (!salesAgentId) notFound();
    const fetchedAgent = await getSalesAgentById(salesAgentId);
    if (!fetchedAgent) notFound();
    initialData = parseStringify(fetchedAgent);
  }

  return (
    <SalesAgentForm
      mode={mode}
      users={users}
      initialData={initialData}
      generatedAgentCode={generatedAgentCode}
    />
  );
}
