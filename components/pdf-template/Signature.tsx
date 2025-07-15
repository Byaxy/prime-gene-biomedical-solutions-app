/* eslint-disable jsx-a11y/alt-text */
import { Text, View, StyleSheet, Image } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  signatureSection: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    marginBottom: 20,
    marginLeft: 50,
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
    <View style={styles.signatureSection}>
      <Text style={{ fontWeight: "bold" }}>Stamp & Signature:</Text>
      {signatureUrl && (
        <Image src={signatureUrl} style={{ width: 60, height: 25 }} />
      )}
      <Text
        style={{ fontWeight: "bold", marginTop: `${signatureUrl ? 2 : 30}` }}
      >
        {title}
      </Text>
    </View>
  );
};

export default Signature;
