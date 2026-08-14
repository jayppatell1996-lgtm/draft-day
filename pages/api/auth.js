// Dummy endpoint for OTP send/verification

export default async function handler(req, res) {
    if (req.method === 'POST') {
      const { phone, action } = req.body;
      // Replace this with proper OTP logic using Supabase or a third-party service
      if (action === 'send') {
        // Simulate OTP send
        res.status(200).json({ message: "OTP sent successfully." });
      } else if (action === 'verify') {
        // Simulate OTP verification
        res.status(200).json({ message: "OTP verified successfully." });
      } else {
        res.status(400).json({ message: "Invalid action" });
      }
    } else {
      res.status(405).json({ message: "Method not allowed" });
    }
  }  