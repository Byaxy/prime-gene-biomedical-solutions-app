"use client";

import { useEffect } from "react";
import { useCompanySettings } from "@/hooks/useCompanySettings";

type TitleUpdaterProps = {
  defaultTitle: string;
};

export function TitleUpdater({ defaultTitle }: TitleUpdaterProps) {
  const { companySettings } = useCompanySettings();

  useEffect(() => {
    if (companySettings && companySettings.name) {
      document.title = `${companySettings.name} | Sales and Inventory Management System`;
    } else {
      document.title = defaultTitle;
    }
  }, [companySettings, defaultTitle]);

  return null;
}
