import { Text, View } from "@react-pdf/renderer";

const ThankYouNote = () => {
  return (
    <View
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        marginTop: 15,
      }}
    >
      <Text
        style={{
          textAlign: "center",
          fontWeight: "bold",
          fontSize: 10,
          color: "#002060",
        }}
      >
        Thank You for Doing Business with us
      </Text>
    </View>
  );
};

export default ThankYouNote;
