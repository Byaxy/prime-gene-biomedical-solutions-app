import { Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  waybillInfo: {
    fontSize: 10,
    marginBottom: 5,
  },
  waybillInfoContainer: {
    display: "flex",
    flexDirection: "row",
    gap: 10,
  },
});
const OfficerSignature = ({ title }: { title: string }) => {
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
        <Text style={{ fontWeight: "bold", fontSize: 10 }}>{title}:</Text>
      </View>
      <View
        style={{
          display: "flex",
          flexDirection: "column",
          paddingLeft: 5,
          paddingTop: 2,
        }}
      >
        <View style={{ ...styles.waybillInfoContainer, marginTop: 5 }}>
          <Text style={{ ...styles.waybillInfo }}>Name:</Text>
          <Text style={{ ...styles.waybillInfo }}>{Array(35).join("-")}</Text>
        </View>
        <View style={styles.waybillInfoContainer}>
          <Text style={{ ...styles.waybillInfo }}>Position:</Text>
          <Text style={{ ...styles.waybillInfo }}>{Array(35).join("-")}</Text>
        </View>
        <View style={styles.waybillInfoContainer}>
          <Text style={{ ...styles.waybillInfo }}>Signature:</Text>
          <Text style={{ ...styles.waybillInfo }}>{Array(35).join("-")}</Text>
        </View>
        <View style={styles.waybillInfoContainer}>
          <Text style={{ ...styles.waybillInfo }}>Date:</Text>
          <Text style={{ ...styles.waybillInfo }}>{Array(35).join("-")}</Text>
        </View>
      </View>
    </View>
  );
};

export default OfficerSignature;
