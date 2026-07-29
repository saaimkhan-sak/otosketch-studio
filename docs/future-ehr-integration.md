# Future EHR Integration

Do not build EHR integration into the MVP.

The likely future path is:

1. Launch from the EHR through SMART App Launch.
2. Receive patient and user context.
3. Retrieve or receive the selected operative note.
4. Extract structured facts.
5. Render a draft diagram.
6. Require surgeon review and correction.
7. Write the approved visual summary back as `DocumentReference` metadata with PDF/SVG/PNG content as an attachment or `Binary`.

Before this can process real ePHI, the project needs institutional approval, HIPAA-compliant hosting arrangements, a BAA with any cloud provider handling ePHI, security risk analysis, audit logging, access control, deletion/retention policy, and legal review.
