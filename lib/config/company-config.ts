import { CompanyConfig } from "@/types";

const companyConfigs: Record<string, CompanyConfig> = {
  nbs: {
    pdfHeader: {
      logo: "/assets/logos/nbs-logo.jpeg",
      name: "NORTHLAND BIOMEDICAL SOLUTIONS",
      addressLine1: "Rockville Valley, Johnson Compound, Haile Selassie",
      addressLine2: "Avenue, Capitol Bypass, Monrovia-Liberia",
      phone: "+231 775508118 | +231 888725323",
      email: "info@northlandbiomedicalsolutions.com",
      website: "www.northlandbiomedicalsolutions.com",
    },
    bankDetails: {
      bankName: "Ecobank Liberia Limited.",
      address: "11th Street, Sinkor, Monrovia, Liberia",
      accountNumber: "6102122392",
      swiftCode: "ECOCLRLMXXX",
    },
    pdfBackgroundImage: "/assets/logos/nbs-logo.jpeg",
    reffNumberPrefix: "NBS",
  },
  pbs: {
    pdfHeader: {
      logo: "/assets/logos/pbs-logo.jpeg",
      name: "PRIME GENE BIOMEDICAL SOLUTIONS",
      addressLine1: "GG-299-4535, ECOWAS Highway, Kwabenya",
      addressLine2: "A North, Greater Accra, Ghana",
      phone: "+233(0)244756260 | +233(0)244364439",
      email: "info@primegenebiomedicalbiosolutions.com",
      website: "www.primegenebiomedicalsolutions.com",
    },
    bankDetails: {
      bankName: "ECOBANK GHANA PLC.",
      address: "H/No AT A39, Mile 7 New Achimota, Accra, Ghana",
      accountNumber: "1441005056783",
      swiftCode: "ECOCGHACXX",
    },
    pdfBackgroundImage: "/assets/logos/pbs-logo.jpeg",
    reffNumberPrefix: "PBS",
  },
};

export const getCompanyConfig = (): CompanyConfig => {
  const companyId = process.env.NEXT_PUBLIC_COMPANY_ID || "nbs";

  return companyConfigs[companyId];
};
