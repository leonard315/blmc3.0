import { Inquiry } from '../models/index.js';
import { updateInquiryStatus } from '../controllers/inquiryController.js';

async function run() {
  try {
    // Create a test inquiry
    const test = await Inquiry.create({
      fullName: 'Demo User',
      email: 'demo.user@example.com',
      address: '123 Demo St',
      contactNo: '09171234567',
      formData: JSON.stringify({ demo: true }),
      status: 'pending'
    });

    console.log('Created test inquiry with id:', test.id);

    // Mock Express req/res
    const req = { params: { id: test.id }, body: { status: 'pending' } };
    const res = {
      json: (obj) => {
        console.log('Controller response:', obj);
      },
      status: (code) => ({ json: (obj) => console.log('Status', code, obj) })
    };

    // Call controller to trigger email sending
    await updateInquiryStatus(req, res);
    process.exit(0);
  } catch (err) {
    console.error('Demo failed:', err);
    process.exit(1);
  }
}

run();
