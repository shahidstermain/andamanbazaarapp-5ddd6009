UPDATE public.posts
SET content = replace(
  replace(
    content,
    '> 🙌 **Special shout-out: Pushkar** — running Drifters at Driftwood and keeping the city''s loudest dance floor alive. If you walk in, say hi. Half the reason the place feels like a proper club night is the energy his crew brings.',
    '> 🙌 **Special shout-out: Pushkar** — running Drifters at Driftwood and keeping the city''s loudest dance floor alive. If you walk in, say hi. Half the reason the place feels like a proper club night is the energy his crew brings.
>
> 💬 [Message Pushkar on WhatsApp](https://wa.me/919933212434?text=Hi%20Pushkar%2C%20this%20is%20the%20AndamanBazaar%20editorial%20team.%20We%27ve%20just%20featured%20Drifters%20Lounge%20in%20our%20Port%20Blair%20nightlife%20story%20and%20would%20love%20to%20publish%20your%20official%20photos%20with%20full%20credit.%20Could%20you%20share%20a%20few%3F%20Thank%20you%21)'
  ),
  '> 🙌 **Special shout-out: Vishnu** — running Nimbu Pani and quietly building one of the warmest local pub corners in the city. The kind of host who remembers your drink the second time you walk in.',
  '> 🙌 **Special shout-out: Vishnu** — running Nimbu Pani and quietly building one of the warmest local pub corners in the city. The kind of host who remembers your drink the second time you walk in.
>
> 💬 [Message Vishnu on WhatsApp](https://wa.me/917865078594?text=Hi%20Vishnu%2C%20this%20is%20the%20AndamanBazaar%20editorial%20team.%20We%27ve%20just%20featured%20Nimbu%20Pani%20Pub%20in%20our%20Port%20Blair%20nightlife%20story%20and%20would%20love%20to%20publish%20your%20official%20photos%20with%20full%20credit.%20Could%20you%20share%20a%20few%3F%20Thank%20you%21)'
),
updated_at = now()
WHERE slug = 'port-blair-nightlife-2026';