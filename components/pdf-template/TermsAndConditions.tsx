import { Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  info: {
    fontSize: 8,
    marginBottom: 2,
  },
});

const TermsAndConditions = () => {
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
        <Text style={styles.info}>
          Prices quoted here are valid for 6 months
        </Text>
        <Text style={styles.info}>Terms of payment is 30 days</Text>
        <Text style={styles.info}>
          This certifies that the Pro-Forma invoice is true and correct
        </Text>
        <Text style={styles.info}>
          When a dispute arises over subtotal or total prices, individual unit
          prices
        </Text>
      </View>
    </View>
  );
};

export default TermsAndConditions;
