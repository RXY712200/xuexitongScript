# Completion evidence maintenance

PARTIAL pending authenticated retesting.

Centralized lesson credit: own completed marker is positive; positive unfinished
counts contradict it; zero alone is insufficient. Child attachment/other lesson
markers do not apply. Marker-only standalone media and credited text-only pages
can now bypass replay after stable revalidation and the existing 5s preview.
Unknown status gets bounded 6s observation; explicitly incomplete lessons do not
incur that wait. Timeout never constitutes completion.

Attachment diagnostic lists order/type and unknown credit, without identifiers.
No verified attachment-specific credit selector was supplied: already credited
individual videos may still replay. No credit was inferred from total counts.
Multiple independent document attachments retain sequential processing; ambiguous
regions within one attachment remain unsupported. Knowledge-map and three-text
viewer ordering is NOT claimed fixed. Replay DOM remains insufficient as before.

Checks: build, verify-v3, customization-v3 and syntax/diff checks passed. Targeted
navigation filter `^credit |^controls |^audio native primary|^multi-attachment inventory`
passed 9/9 Chrome simulated cases. Two new credit cases cover delayed text credit,
marker-only/no-media credit and contradiction cancellation. Historical preservation
snapshots were not rerun: their old catalog/prior-proof expectations are superseded.
No full historical suite or authenticated compatibility PASS is claimed.
