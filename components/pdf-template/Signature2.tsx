import { Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  container: {
    display: "flex",
    flexDirection: "column",
    flex: 1,
    gap: 2,
    marginBottom: 20,
    marginTop: 40,
    color: "#000",
  },
});

const Signature2 = ({ title }: { title: string }) => {
  return (
    <View style={styles.container}>
      <Text>{Array(55).join("-")}</Text>
      <Text style={{ fontWeight: "medium" }}>Stamp & Signature:</Text>
      <Text style={{ fontWeight: "medium" }}>{title}</Text>
    </View>
  );
};

export default Signature2;
