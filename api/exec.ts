export const config = {
    runtime: 'edge', // Vercel Edge Function
};

export default async function handler(request: Request) {
    // 1. Pega o header User-Agent da requisição
    const userAgent = request.headers.get('user-agent') || '';

    // 2. Verifica se a requisição está vindo do cliente Roblox
    // O Roblox usa User-Agents que contêm "Roblox", "RobloxStudio", etc.
    const isRoblox = userAgent.toLowerCase().includes('roblox');

    if (!isRoblox) {
        // Se não for o Roblox (ex: navegador Chrome, Firefox, Postman)
        // Retorna mensagem de erro em branco/proibido
        return new Response('ERRO: Você não pode acessar o código aberto desse script.', {
            status: 403,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });

        // Alternativa: Se preferir redirecionar para a home do site:
        // return Response.redirect('https://www.slenderhub.shop/', 302);
    }

    // 3. Coloque seu script Lua diretamente aqui entre as crases (`) 
    // Dessa forma ele NUNCA ficará exposto em uma URL "Raw" pública.
    // Somente a Vercel compila isso no backend e entrega o texto.
    const meuScriptLua = `
print("✅ Conectado ao Slender Hub API com sucesso!")

-- Cole todo o código fonte do seu script AQUI
-- Exemplo:
--!strict
--[[
    Slender Hub - INTELLIGENT TIER SYSTEM (V2.5.1 - SLENDERWIND EDITION)
    Architecture: Universal Key System
    UI Library: SlenderWind V5 (Internal)
    Status: ✅ Pickaxe Simulator
    Status: ✅ The Forge
    Status: ✅ Tap Simulator
    Status: ✅ Brookhaven RP
    Status: ✅ Horse Race 
    Status: ✅ Royal Hatchers 
]]

--//==============================[ SERVICES ]==============================//--
local HttpService = game:GetService("HttpService")
local Players = game:GetService("Players")
local StarterGui = game:GetService("StarterGui")
local MarketService = game:GetService("MarketplaceService")
local CoreGui = game:GetService("CoreGui")

local LocalPlayer = Players.LocalPlayer
local CurrentPlaceId = game.PlaceId

--//==============================[ ⚠ CONFIGURATION ]==============================//--
local VELINK_IDS = {
    -- [LINK ID] = {Type, Seconds}
    ["ed6453e6-5259-49b4-8779-05b866831dc2"] = {Type = "Premium", Duration = 604800},  -- 7 Days
    ["2c69fdcf-f8e1-4c1a-9270-f36d9545ebce"] = {Type = "Premium", Duration = 2592000}  -- 30 Days
}

local Config = {
    FOLDER = "SlenderHub_Universal", 
    FILE = "KeyData_" .. LocalPlayer.UserId .. ".json",
    VELINK_CHECK_URL = "https://velink.to/api/public/check/key",
    FREE_KEY_LINK = "https://velink.to/u/678807",
    PREMIUM_SHOP_URL = "https://www.slenderhub.shop/"
}

--//==============================[ SUPPORTED GAMES ]==============================//--
local GAMES_MAP = {
    [82013336390273] = "https://raw.githubusercontent.com/SlenderYt567/sc/main/Pickaxe%20Simulator%20script",
    [107807115409153] = "https://raw.githubusercontent.com/SlenderYt567/sc/main/Bee%20Tappers%20Script",
    [109983668079237] = "https://raw.githubusercontent.com/SlenderYt567/sc/main/Steal%20a%20Brainrot(Free)",
    [76558904092080] = "https://raw.githubusercontent.com/SlenderYt567/sc/main/The%20Forge%20Script",
    [75992362647444] = "https://raw.githubusercontent.com/SlenderYt567/sc/main/Tap%20simulator",
    [4924922222] = "https://raw.githubusercontent.com/SlenderYt567/sc/refs/heads/main/Brookhaven%20script",
    [93787311916283] = "https://raw.githubusercontent.com/SlenderYt567/sc/refs/heads/main/Horse%20Race",
    [120405647949186] = "https://raw.githubusercontent.com/SlenderYt567/sc/refs/heads/main/Royal%20Hatchers%20Script"
}

local TARGET_SCRIPT_URL = GAMES_MAP[CurrentPlaceId]

--//==============================[ LIFETIME KEYS ]==============================//--
local LIFETIME_KEYS = {
    ["LifeTimeF4K9L2P7V8JDHUtY"] = true,
    ["SlenderDevKey"] = true
}

local FILE_PATH = Config.FOLDER .. "/" .. Config.FILE
local isAccessAuthorized = false
local authorizedKeyType = "Free"
local authorizedDuration = 86400

--//==============================[ BACKEND LOGIC ]==============================//--
local Window = nil -- Declared here to be accessible by Notify and assigned later

local function Notify(title: string, text: string, duration: number?, nType: string?)
    if Window and Window.Notify then
        Window:Notify(title, text, duration or 5, nType or "Success")
    else
        pcall(function()
            StarterGui:SetCore("SendNotification", {
                Title = title,
                Text = text,
                Duration = duration or 5,
            })
        end)
    end
end

local function formatTime(seconds: number): string
    if seconds == math.huge then return "Lifetime" end
    local days = math.floor(seconds / 86400)
    local hours = math.floor((seconds % 86400) / 3600)
    local minutes = math.floor((seconds % 3600) / 60)
    return string.format("%dd %02dh %02dm", days, hours, minutes)
end

local function loadGameScript(accessLevel: string, shouldCloseUI: boolean)
    if not TARGET_SCRIPT_URL then 
        warn("🔴 [Slender Hub] Script URL not found for Place ID: " .. CurrentPlaceId)
        Notify("Slender Hub", "Game Not Supported (Check ID)", 5)
        return 
    end
    
    -- Set Global Environment
    if getgenv then 
        getgenv().SlenderHubAccessLevel = accessLevel
    else 
        _G.SlenderHubAccessLevel = accessLevel 
    end
    
    -- Close UI if requested
    if shouldCloseUI then
        pcall(function()
            for _, ui in pairs(CoreGui:GetChildren()) do
                if ui.Name == "SlenderWind" or ui.Name:find("Slender") then
                    ui:Destroy()
                end
            end
        end)
    end
    
    -- Execute Script
    task.wait(0.3)
    local success, err = pcall(function()
        loadstring(game:HttpGet(TARGET_SCRIPT_URL))() 
    end)
    if not success then
        warn("Failed to load script: " .. tostring(err))
        Notify("Error", "Failed to load script! Check Console (F9)", 5)
    end
end

local function verifyKeyWithAPI(inputKey: string): (string?, number?)
    if LIFETIME_KEYS[inputKey] then return "Premium", math.huge end

    local requestUrl = string.format("%s?key=%s", Config.VELINK_CHECK_URL, inputKey)
    local requestFunc = (syn and syn.request) or (http and http.request) or (http_request) or (request)
    
    if not requestFunc then return nil, nil end

    local successReq, response = pcall(function()
        return requestFunc({Url = requestUrl, Method = "GET"})
    end)

    if successReq and response and response.StatusCode == 200 then
        local success, data = pcall(function() return HttpService:JSONDecode(response.Body) end)
        
        if success and data and data.expired == false then
            local unlockerId = tostring(data.unlockerId)
            print("🔐 [SLENDER HUB] ID Validado: " .. unlockerId)
            
            local tierInfo = VELINK_IDS[unlockerId]
            if tierInfo then
                return tierInfo.Type, tierInfo.Duration
            else
                return "Free", 86400
            end
        end
    end
    return nil, nil
end

local function saveKey(keyType: string, keyContent: string, duration: number)
    if not isfolder(Config.FOLDER) then makefolder(Config.FOLDER) end
    local data = {
        Type = keyType, 
        Key = keyContent, 
        Time = workspace:GetServerTimeNow(),
        CustomDuration = duration
    }
    writefile(FILE_PATH, HttpService:JSONEncode(data))
end

local function checkLocalKey(): (boolean, any, number?)
    if not isfile(FILE_PATH) then return false, nil end
    local success, data = pcall(function() return HttpService:JSONDecode(readfile(FILE_PATH)) end)
    if not success or not data or not data.Time then delfile(FILE_PATH); return false, nil end

    local duration = data.CustomDuration or 86400
    if duration == math.huge then return true, data, math.huge end

    local elapsed = workspace:GetServerTimeNow() - data.Time
    if elapsed > duration then
        delfile(FILE_PATH); return false, nil
    end
    return true, data, (duration - elapsed)
end

--//==============================[ AUTO-EXECUTE CHECK ]==============================//--
local isSaved, savedData, remainingTime = checkLocalKey()

if isSaved and TARGET_SCRIPT_URL then
    local timeMsg = (remainingTime == math.huge) and "Lifetime Access" or formatTime(remainingTime)
    Notify("Slender Hub", "Auto-Login! Remaining: " .. timeMsg, 3)
    task.wait(0.5)
    loadGameScript(savedData.Type, false)
    return -- Stop script here, do not load UI
end

--//==============================[ SLENDERWIND UI ]==============================//--
local SlenderWind = loadstring(game:HttpGet("https://raw.githubusercontent.com/SlenderYt567/sc/refs/heads/main/SlenderWind.lua"))()

Window = SlenderWind.Window({
    Name = "Slender Hub | Universal",
    KeySystem = false, -- We are building the key system manually
    Theme = { Accent = Color3.fromRGB(0, 255, 127) } -- Slender Green
})

local Tab = Window:Tab("Authentication")

-- Game Status Logic
local gameName = "Unknown Game"
pcall(function() gameName = MarketService:GetProductInfo(CurrentPlaceId).Name end)
local statusText = TARGET_SCRIPT_URL and "✅ Supported: " .. gameName or "⚠ Unsupported Game"

Tab:Paragraph("Status", statusText .. "\n(ID: " .. CurrentPlaceId .. ")")

-- Key Input
Tab:Input("Enter Key", "VELINK-XXXX...", "KeyInput", "Paste your key here", function(text)
    local key = text:gsub("%s+", "") -- Clean spaces
    
    if #key < 5 then return end -- Ignore short inputs
    
    Notify("Checking API...", "Verifying Tier & Duration...", 2)
    
    local keyType, keyDuration = verifyKeyWithAPI(key)
    
    if keyType and keyDuration then
        isAccessAuthorized = true
        authorizedKeyType = keyType
        authorizedDuration = keyDuration
        saveKey(keyType, key, keyDuration)
        
        local durText = (keyDuration == math.huge) and "Lifetime" or formatTime(keyDuration)
        Notify("Success!", keyType .. " Key Validated (" .. durText .. ")", 5, "Success")
    else
        isAccessAuthorized = false
        Notify("Invalid Key", "Expired or Does not Exist.", 3, "Error")
    end
end)

-- Launch Button
Tab:Button("🚀 Launch Hub", "Verify and Load Script", function()
    if not isAccessAuthorized then
        Notify("Access Denied", "Please enter a valid key first.", 3, "Warning")
        return
    end
    
    if not TARGET_SCRIPT_URL then
         Notify("Error", "Script not available for this game.", 3, "Error")
         return
    end
    
    local isSaved, data, remaining = checkLocalKey()
    local timeMsg = (remaining == math.huge) and "Lifetime" or formatTime(remaining)
    Notify("Access Granted", "Loading... " .. timeMsg, 2)
    
    task.wait(0.5)
    loadGameScript(authorizedKeyType, true)
end)

-- Links Section
Tab:Label("Get Access")

Tab:Button("🔑 Get Free Key (24h)", "Copy Link", function()
    setclipboard(Config.FREE_KEY_LINK)
    Notify("Copied", "Link copied to clipboard!", 2)
end)

Tab:Button("💎 Buy Premium (Shop)", "Copy Shop Link", function()
    setclipboard(Config.PREMIUM_SHOP_URL)
    Notify("Shop Copied", "Visit SlenderHub.shop", 3)
end)

-- Esse código NUNCA será visto se acessarem pela web comum!
`;

    // 4. Retorna o conteúdo do script em texto plano para o Roblox ler no loadstring
    return new Response(meuScriptLua, {
        status: 200,
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
        },
    });
}
