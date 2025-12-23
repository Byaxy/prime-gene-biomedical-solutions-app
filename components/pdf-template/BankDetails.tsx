import { getCompanyConfig } from "@/lib/config/company-config";
import { Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  bankSection: {
    display: "flex",
    flexDirection: "row",
    gap: 40,
  },
  bankInfo: {
    fontSize: 8,
    marginBottom: 2,
  },
});

const BankDetails = () => {
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
        <Text style={{ fontWeight: "bold", fontSize: 9 }}>Bank Details</Text>
      </View>
      <View
        style={{
          display: "flex",
          flexDirection: "column",
          paddingHorizontal: 5,
          paddingTop: 2,
          width: "100%",
        }}
      >
        <View style={{ display: "flex", flexDirection: "row", gap: 10 }}>
          <Text style={styles.bankInfo}>Bank Name:</Text>
          <Text style={{ ...styles.bankInfo, flex: 1 }}>
            {config.bankDetails.bankName}
          </Text>
        </View>
        <View style={{ display: "flex", flexDirection: "row", gap: 10 }}>
          <Text style={styles.bankInfo}>Address:</Text>
          <Text style={{ ...styles.bankInfo, flex: 1 }}>
            {config.bankDetails.address}
          </Text>
        </View>
        <View style={{ display: "flex", flexDirection: "row", gap: 10 }}>
          <Text style={styles.bankInfo}>Account #:</Text>
          <Text style={{ ...styles.bankInfo, flex: 1 }}>
            {config.bankDetails.accountNumber}
          </Text>
        </View>
        <View style={{ display: "flex", flexDirection: "row", gap: 10 }}>
          <Text style={styles.bankInfo}>Swift Code:</Text>
          <Text style={{ ...styles.bankInfo, flex: 1 }}>
            {config.bankDetails.swiftCode}
          </Text>
        </View>
      </View>
    </View>
  );
};

export default BankDetails;
