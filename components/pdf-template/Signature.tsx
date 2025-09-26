/* eslint-disable jsx-a11y/alt-text */
import { Text, View, StyleSheet, Image } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  container: {
    display: "flex",
    flexDirection: "column",
    flex: 1,
    gap: 2,
    marginBottom: 20,
    color: "#000",
  },
});

const Signature = ({
  signatureUrl,
  title,
}: {
  signatureUrl?: string;
  title: string;
}) => {
  return (
    <View style={styles.container}>
      <Text style={{ fontWeight: "medium" }}>Stamp & Signature:</Text>
      {signatureUrl && (
        <Image src={signatureUrl} style={{ width: 60, height: 25 }} />
      )}
      <Text
        style={{ fontWeight: "medium", marginTop: `${signatureUrl ? 2 : 30}` }}
      >
        {title}
      </Text>
    </View>
  );
};

export default Signature;
