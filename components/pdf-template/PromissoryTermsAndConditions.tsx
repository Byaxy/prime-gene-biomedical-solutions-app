import { Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  info: {
    fontSize: 8,
    marginBottom: 2,
  },
});

const PromissoryTermsAndConditions = () => {
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
          width: "30%",
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
          By signing above, you agree the terms on this Promissory note are
          correct and accurate, no other terms & conditions shall apply.
        </Text>
      </View>
    </View>
  );
};

export default PromissoryTermsAndConditions;
