import { useCompanySettings } from "@/hooks/useCompanySettings";
import { NumericFormat } from "react-number-format";

const FormatNumber = ({ value }: { value: number | string }) => {
  const { companySettings } = useCompanySettings();

  return (
    <NumericFormat
      value={value}
      thousandSeparator=","
      displayType="text"
      thousandsGroupStyle="thousand"
      type="text"
      prefix={(companySettings && companySettings[0]?.currencySymbol) || "$"}
    />
  );
};

export default FormatNumber;
