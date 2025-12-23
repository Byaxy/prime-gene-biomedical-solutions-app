/* eslint-disable jsx-a11y/alt-text */
import { getCompanyConfig } from "@/lib/config/company-config";
import { Text, View, StyleSheet, Image } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  signatureSection: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    marginBottom: 20,
    marginLeft: 50,
  },
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

const SignatureAndBankSection = () => {
  const config = getCompanyConfig();
  return (
    <View wrap={false}>
      {/* Signature */}
      <View style={styles.signatureSection}>
        <Text style={{ fontWeight: "bold" }}>Stamp & Signature:</Text>
        <Image
          src="/assets/images/signature.png"
          style={{ width: 60, height: 25 }}
        />
        <Text style={{ fontWeight: "bold" }}>Sales Manager</Text>
      </View>

      {/* Bank Details - Terms & Conditions */}
      <View style={styles.bankSection}>
        <View
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <View
            style={{
              backgroundColor: "#E8E9E9",
              paddingVertical: 2,
              paddingHorizontal: 5,
            }}
          >
            <Text style={{ fontWeight: "bold", fontSize: 9 }}>
              Bank Details
            </Text>
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

        <View
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <View
            style={{
              backgroundColor: "#E8E9E9",
              paddingVertical: 2,
              paddingHorizontal: 5,
            }}
          >
            <Text style={{ fontWeight: "bold", fontSize: 9 }}>
              Terms & Conditions
            </Text>
          </View>
          <View
            style={{
              display: "flex",
              flexDirection: "column",
              paddingHorizontal: 5,
              paddingTop: 2,
            }}
          >
            <Text style={styles.bankInfo}>
              Prices quoted here are valid for 6 months
            </Text>
            <Text style={styles.bankInfo}>Terms of payment is 30 days</Text>
            <Text style={styles.bankInfo}>
              This certifies that the Pro-Forma invoice is true and correct
            </Text>
            <Text style={styles.bankInfo}>
              When a dispute arises over subtotal or total prices, individual
              unit prices
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

export default SignatureAndBankSection;
