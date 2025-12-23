import { getCompanyConfig } from "@/lib/config/company-config";
import { Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  addressInfo: {
    fontSize: 9,
    marginBottom: 2,
  },
});

const CompanyAddress = ({
  addressTitle,
  companySettings,
}: {
  addressTitle: string;
  companySettings: {
    name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    country: string;
    currencySymbol: string;
  };
}) => {
  const config = getCompanyConfig();

  return (
    <View
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        color: "#000",
      }}
    >
      <View
        style={{
          backgroundColor: "#819AC2",
          paddingTop: 3,
          paddingBottom: 3,
          paddingHorizontal: 5,
        }}
      >
        <Text style={{ fontWeight: "bold", fontSize: 10 }}>
          {addressTitle}:
        </Text>
      </View>
      <View
        style={{
          display: "flex",
          flexDirection: "column",
          paddingLeft: 5,
          paddingTop: 2,
        }}
      >
        <Text
          style={{
            fontSize: 8,
            fontWeight: "bold",
            marginBottom: 2,
          }}
        >
          {config.pdfHeader.name || companySettings.name || "N/A"}
        </Text>
        <Text style={styles.addressInfo}>
          {config.pdfHeader.addressLine1 || companySettings.address || "N/A"}
        </Text>
        <Text style={styles.addressInfo}>
          {config.pdfHeader.addressLine2 || companySettings.city || "N/A"}
        </Text>
        <Text style={styles.addressInfo}>
          {config.pdfHeader.phone || companySettings.phone || "N/A"}
        </Text>
        <Text style={styles.addressInfo}>
          {config.pdfHeader.email || companySettings.email || "N/A"}
        </Text>
      </View>
    </View>
  );
};

export default CompanyAddress;
