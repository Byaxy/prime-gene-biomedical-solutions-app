import { Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  title: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    color: "#00fdff",
  },
});
const PDFTittle = ({ title }: { title: string }) => {
  return (
    <View
      style={{
        width: "100%",
        backgroundColor: "#002060",
        paddingVertical: 4,
      }}
    >
      <Text style={styles.title}>{title}</Text>
    </View>
  );
};

export default PDFTittle;
