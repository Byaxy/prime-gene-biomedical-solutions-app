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
          backgroundColor: "#b8c9c1e7",
          paddingTop: 3,
          paddingBottom: 3,
          paddingHorizontal: 5,
          border: "1px solid #000",
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
            Ecobank Liberia Limited.
          </Text>
        </View>
        <View style={{ display: "flex", flexDirection: "row", gap: 10 }}>
          <Text style={styles.bankInfo}>Address:</Text>
          <Text style={{ ...styles.bankInfo, flex: 1 }}>
            11th Street, Sinkor, Monrovia, Liberia
          </Text>
        </View>
        <View style={{ display: "flex", flexDirection: "row", gap: 10 }}>
          <Text style={styles.bankInfo}>Account #:</Text>
          <Text style={{ ...styles.bankInfo, flex: 1 }}>6102122392</Text>
        </View>
        <View style={{ display: "flex", flexDirection: "row", gap: 10 }}>
          <Text style={styles.bankInfo}>Swift Code:</Text>
          <Text style={{ ...styles.bankInfo, flex: 1 }}>ECOCLRLMXXX</Text>
        </View>
      </View>
    </View>
  );
};

export default BankDetails;
