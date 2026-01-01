function onLoad(save_state)
    up = self.getTransformUp()[2]
end

--Start Countdown
function onCollisionEnter(collision_info)

    if up == nil then return end

    if up > 0 and self.getTransformUp()[2] < 0 or up < 0 and self.getTransformUp()[2] > 0 then
        local time = self.getDescription()

        local rot = self.getTransformUp()

        if rot[2] == -1 then
            self.setRotation({0, 0, 0})
        end

        if tonumber(time) ~= nil then
            local ind = tonumber(time)-1
            if ind < 0 then ind = 0 end
            if ind > 4 then ind = 4 end

            if ind == 0 then self.setName("Hourglass (5 seconds)") end
            if ind == 1 then self.setName("Hourglass (10 seconds)") end
            if ind == 2 then self.setName("Hourglass (30 seconds)") end
            if ind == 3 then self.setName("Hourglass (1 minute)") end
            if ind == 4 then self.setName("Hourglass (5 minutes)") end
            self.AssetBundle.playTriggerEffect(tonumber(time)-1)
        else
            print("Hourglass not setup correctly. Make sure its Description is 1, 2, 3, 4 or 5")
        end
        if time == "" then
            print("Hourglass Descripton empty, setting to 1.")
            self.setName("Hourglass (5 seconds)")
            self.setDescription("1")
            self.AssetBundle.playTriggerEffect(0)
        end

        up = self.getTransformUp()[2]
    end
end