import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MdOutlineHelp, MdOutlineBugReport } from 'react-icons/md';
import { toast } from 'sonner';
import MenuListItem from '../../components/common/MenuListItem';
import SettingsGroup from '@/components/settings/SettingsGroup';
import SettingsItem from '@/components/settings/SettingsItem';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
    READING_SPEED_KEY,
    READING_SPEED,
    SPEAKER_KEY,
    SPEAKER,
    DEFAULT_MODE_KEY,
    DEFAULT_MODE,
    AUTO_FLASHLIGHT_KEY,
    AUTO_FLASHLIGHT,
    VOICE_FEEDBACK_KEY,
    VOICE_FEEDBACK,
} from '../../constants/settingsPage'

export default function SettingsPage() {
    const navigate = useNavigate();

    // Persist settings in localStorage
    const [readingSpeed, setReadingSpeed] = useState(() => READING_SPEED);
    const [speaker, setSpeaker] = useState(() => SPEAKER);
    const [defaultMode, setDefaultMode] = useState(() => DEFAULT_MODE);
    const [autoFlashlight, setAutoFlashlight] = useState(() => AUTO_FLASHLIGHT);
    const [voiceFeedback, setVoiceFeedback] = useState(() => VOICE_FEEDBACK);

    const readingSpeeds = [
        { label: "0.5x", value: 0.5 },
        { label: "0.75x", value: 0.75 },
        { label: "1x", value: 1.0 },
        { label: "1.25x", value: 1.25 },
        { label: "1.5x", value: 1.5 },
        { label: "1.75x", value: 1.75 },
        { label: "2x", value: 2.0 },
    ]

    const speakers = [
        { label: "هومن (مرد)", value: "speaker-1" },
        { label: "رامین (مرد)", value: "speaker-2" },
        { label: "شیرین (زن)", value: "speaker-3" },
        { label: "هدی (زن)", value: "speaker-4" },
    ]

    const CameraModes = [
        { label: "هر بار پرسیده شود", value: "ask" },
        { label: "خودکار", value: "automatic" },
        { label: "دستی", value: "manual" },
    ]

    const updateSetting = (key, value, setter) => {
        setter(value);
        localStorage.setItem(key, value);
        toast.success("تنظیمات به‌روزرسانی شد", {
            duration: 1500,
        });
    };

    return (
        <div className="w-full">
            <form className="dir-rtl mx-auto flex w-full flex-col gap-5" onSubmit={(e) => e.preventDefault()}>

                {/* section: Reading Settings */}
                <SettingsGroup title="تنظیمات خوانش" >
                    <SettingsItem title="سرعت پیش‌فرض خوانش" subtitle="متن‌ها به طور پیش‌فرض با این سرعت خوانده می‌شوند">
                        <Select value={readingSpeed} onValueChange={(value) => updateSetting(READING_SPEED_KEY, value, setReadingSpeed)}>
                            <SelectTrigger className="w-full" dir="rtl">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent dir="rtl" data-lang="arabic">
                                {readingSpeeds.map((item) => (
                                    <SelectItem key={item.value} value={item.value}>
                                        {item.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </SettingsItem>
                    <SettingsItem title="گویندۀ متن‌ها" subtitle="متن‌ها با این صدای گوینده خوانده می‌شوند">
                        <Select value={speaker} onValueChange={(value) => updateSetting(SPEAKER_KEY, value, setSpeaker)}>
                            <SelectTrigger className="w-full" dir="rtl">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent dir="rtl" data-lang="arabic">
                                {speakers.map((item) => (
                                    <SelectItem key={item.value} value={item.value}>
                                        {item.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </SettingsItem>
                </SettingsGroup>

                {/* section: Imaging Settings */}
                <SettingsGroup title="تنظیمات تصویربرداری">
                    <SettingsItem title="حالت تصویربرداری" subtitle="در صورت انتخاب حالت به صورت مستقیم وارد محیط تصویربرداری می‌شود">
                        <Select value={defaultMode} onValueChange={(value) => updateSetting(DEFAULT_MODE_KEY, value, setDefaultMode)}>
                            <SelectTrigger className="w-full" dir="rtl">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent dir="rtl" data-lang="arabic">
                                {CameraModes.map((item) => (
                                    <SelectItem key={item.value} value={item.value}>
                                        {item.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </SettingsItem>
                    <SettingsItem title="چراغ‌قوۀ خودکار" subtitle="به محض تشخیص محیط با نور کم، چراغ‌قوه (فلش) خودکار روشن می‌شود" isCol={false}>
                        <Switch checked={autoFlashlight} onCheckedChange={(value) => updateSetting(AUTO_FLASHLIGHT_KEY, value, setAutoFlashlight)} />
                    </SettingsItem>
                </SettingsGroup>

                {/* section: Accessibility */}
                <SettingsGroup title="دسترس‌پذیری">
                    <SettingsItem title="بازخوردهای صوتی" subtitle="در هر بخش، راهنمای صوتی برای کاربر پخش می‌شود" isCol={false}>
                        <Switch checked={voiceFeedback} onCheckedChange={(value) => updateSetting(VOICE_FEEDBACK_KEY, value, setVoiceFeedback)} />
                    </SettingsItem>
                </SettingsGroup>

                {/* Buttons list */}
                <div className="mt-2 flex w-full flex-col gap-3">
                    <MenuListItem
                        icon={<MdOutlineHelp size={"1.5rem"} />}
                        label="راهنما"
                        variant="info"
                        onClick={() => toast.info("راهنمای صوتی به‌زودی فعال خواهد شد.")}
                    />

                    <MenuListItem
                        icon={<MdOutlineBugReport size={"1.5rem"} />}
                        label="گزارش خطا یا پیشنهاد"
                        variant="danger"
                        onClick={() => navigate("/settings/report-bug")}
                    />

                    <p className="text-center text-sm text-gray-400 mt-2">
                        دستیار تبدیل عکس به گفتار خوانا (ویرایش 1.0.0)
                    </p>
                </div>
            </form>
        </div>
    );
}